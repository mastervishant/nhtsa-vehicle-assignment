import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

import { MakeEntity } from './make.entity';
import { VehicleTypeEntity } from './vehicle-type.entity';
import { MakeDto } from './dto/make.dto';
import { NhtsaClient } from './nhtsa.client';

@Injectable()
export class MakesService {
  private readonly concurrency = 5;

  constructor(
    @InjectRepository(MakeEntity)
    private readonly makeRepository: Repository<MakeEntity>,

    @InjectRepository(VehicleTypeEntity)
    private readonly vehicleTypeRepository: Repository<VehicleTypeEntity>,

    private readonly nhtsaClient: NhtsaClient,

    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MakesService.name);
  }

  async findAll(): Promise<MakeDto[]> {
    try {
      this.logger.debug(
        'Fetching all makes from database',
      );

      const makes = await this.makeRepository.find({
        relations: {
          vehicleTypes: true,
        },
        order: {
          id: 'ASC',
        },
      });

      this.logger.debug(
        {
          count: makes.length,
        },
        'Fetched makes from database',
      );

      return makes.map((make) =>
        this.toDto(make),
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          operation: 'findAll',
        },
        'Failed to fetch makes from database',
      );

      throw error;
    }
  }

  async findOne(
    makeId: number,
  ): Promise<MakeDto | null> {
    try {
      this.logger.debug(
        {
          makeId,
        },
        'Fetching make from database',
      );

      const make =
        await this.makeRepository.findOne({
          where: {
            id: makeId,
          },
          relations: {
            vehicleTypes: true,
          },
        });

      if (!make) {
        this.logger.debug(
          {
            makeId,
          },
          'Make not found',
        );

        return null;
      }

      return this.toDto(make);
    } catch (error) {
      this.logger.error(
        {
          err: error,
          makeId,
          operation: 'findOne',
        },
        'Failed to fetch make from database',
      );

      throw error;
    }
  }

  async ingest(): Promise<{
    makesProcessed: number;
    vehicleTypesProcessed: number;
  }> {
    this.logger.info(
      {
        concurrency: this.concurrency,
      },
      'Starting NHTSA data ingestion',
    );

    const makes =
      await this.nhtsaClient.getAllMakes();

    this.logger.info(
      {
        count: makes.length,
      },
      'Fetched makes from NHTSA for ingestion',
    );

    let makesProcessed = 0;
    let vehicleTypesProcessed = 0;
    let currentIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const index = currentIndex++;

        if (index >= makes.length) {
          return;
        }

        const make = makes[index];

        try {
          this.logger.info(
            {
              index: index + 1,
              total: makes.length,
              makeId: make.makeId,
              makeName: make.makeName,
            },
            'Processing make',
          );

          const vehicleTypes =
            await this.nhtsaClient.getVehicleTypesForMakeId(
              make.makeId,
            );

          await this.makeRepository.upsert(
            {
              id: make.makeId,
              name: make.makeName,
            },
            ['id'],
          );

          await this.vehicleTypeRepository.delete({
            makeId: make.makeId,
          });

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
          vehicleTypesProcessed +=
            vehicleTypes.length;

          this.logger.info(
            {
              makeId: make.makeId,
              makeName: make.makeName,
              vehicleTypes: vehicleTypes.length,
              makesProcessed,
              totalMakes: makes.length,
            },
            'Make processed successfully',
          );
        } catch (error) {
          this.logger.error(
            {
              err: error,
              index: index + 1,
              total: makes.length,
              makeId: make.makeId,
              makeName: make.makeName,
            },
            'Unexpected error while processing make',
          );
        }
      }
    };

    const workerCount = Math.min(
      this.concurrency,
      makes.length,
    );

    const workers = Array.from(
      {
        length: workerCount,
      },
      () => worker(),
    );

    await Promise.all(workers);

    this.logger.info(
      {
        makesProcessed,
        makesFailed:
          makes.length - makesProcessed,
        vehicleTypesProcessed,
      },
      'NHTSA data ingestion completed',
    );

    return {
      makesProcessed,
      vehicleTypesProcessed,
    };
  }

  private toDto(
    make: MakeEntity,
  ): MakeDto {
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