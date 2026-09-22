import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MakeEntity } from './make.entity';
import { VehicleTypeEntity } from './vehicle-type.entity';
import { NhtsaClient } from './nhtsa.client';
import { MakeDto } from './dto/make.dto';

@Injectable()
export class MakesService {
  private readonly concurrency = 5;

  constructor(
    @InjectRepository(MakeEntity)
    private readonly makeRepository: Repository<MakeEntity>,

    @InjectRepository(VehicleTypeEntity)
    private readonly vehicleTypeRepository: Repository<VehicleTypeEntity>,

    private readonly nhtsaClient: NhtsaClient,
  ) {}

  /**
   * Returns all makes with their vehicle types.
   */
  async findAll(): Promise<MakeDto[]> {
    const makes = await this.makeRepository.find({
      relations: {
        vehicleTypes: true,
      },
      order: {
        id: 'ASC',
      },
    });

    return makes.map((make) => this.toDto(make));
  }

  /**
   * Returns one make with its vehicle types.
   */
  async findOne(makeId: number): Promise<MakeDto | null> {
    const make = await this.makeRepository.findOne({
      where: {
        id: makeId,
      },
      relations: {
        vehicleTypes: true,
      },
    });

    if (!make) {
      return null;
    }

    return this.toDto(make);
  }

  /**
   * Fetches all makes from NHTSA and then fetches the
   * vehicle types for every make using bounded concurrency.
   */
  async ingest(): Promise<{
    makesProcessed: number;
    vehicleTypesProcessed: number;
  }> {
    console.log('Fetching all makes from NHTSA...');

    const makes = await this.nhtsaClient.getAllMakes();

    console.log(`Found ${makes.length} makes.`);

    let makesProcessed = 0;
    let vehicleTypesProcessed = 0;

    let currentIndex = 0;

    /**
     * Each worker processes one make at a time.
     *
     * The number of workers is limited by this.concurrency,
     * so we don't send requests for every make simultaneously.
     */
    const worker = async (): Promise<void> => {
      while (true) {
        const index = currentIndex++;

        if (index >= makes.length) {
          return;
        }

        const make = makes[index];

        try {
          console.log(
            `[${index + 1}/${makes.length}] Processing make ${make.makeId} - ${make.makeName}`,
          );

          /*
           * Fetch vehicle types from NHTSA.
           */
          const vehicleTypes =
            await this.nhtsaClient.getVehicleTypesForMakeId(make.makeId);

          /*
           * Insert/update the make.
           */
          await this.makeRepository.upsert(
            {
              id: make.makeId,
              name: make.makeName,
            },
            ['id'],
          );

          /*
           * Remove existing vehicle types for this make.
           *
           * This makes the ingestion idempotent. If we run the
           * ingestion again, stale vehicle types won't remain.
           */
          await this.vehicleTypeRepository.delete({
            makeId: make.makeId,
          });

          /*
           * Insert the latest vehicle types.
           */
          if (vehicleTypes.length > 0) {
            await this.vehicleTypeRepository.insert(
              vehicleTypes.map((vehicleType) => ({
                id: vehicleType.typeId,
                name: vehicleType.typeName,
                makeId: make.makeId,
              })),
            );
          }

          makesProcessed += 1;
          vehicleTypesProcessed += vehicleTypes.length;

          console.log(
            `Completed ${make.makeId} - ${make.makeName}: ` +
              `${vehicleTypes.length} vehicle types`,
          );
        } catch (error) {
          /*
           * Don't stop the complete ingestion because one make failed.
           * The NHTSA client already handles retries.
           */
          console.error(
            `Failed to process make ${make.makeId} - ${make.makeName}`,
            error,
          );
        }
      }
    };

    /*
     * Start a maximum of `this.concurrency` workers.
     */
    const workers = Array.from(
      {
        length: Math.min(this.concurrency, makes.length),
      },
      () => worker(),
    );

    await Promise.all(workers);

    console.log('Ingestion completed.');

    return {
      makesProcessed,
      vehicleTypesProcessed,
    };
  }

  /**
   * Converts the database entity into the GraphQL DTO.
   */
  private toDto(make: MakeEntity): MakeDto {
    return {
      makeId: make.id,
      makeName: make.name,
      vehicleTypes: (make.vehicleTypes ?? [])
        .sort((a, b) => a.id - b.id)
        .map((vehicleType) => ({
          typeId: vehicleType.id,
          typeName: vehicleType.name,
        })),
    };
  }
}