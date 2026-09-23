import { Repository } from 'typeorm';

import { MakesService } from '../src/makes/makes.service';
import { MakeEntity } from '../src/makes/make.entity';
import { VehicleTypeEntity } from '../src/makes/vehicle-type.entity';
import { NhtsaClient } from '../src/makes/nhtsa.client';

describe('MakesService', () => {
  let service: MakesService;

  let makeRepository: Repository<MakeEntity>;
  let vehicleTypeRepository: Repository<VehicleTypeEntity>;
  let nhtsaClient: NhtsaClient;

  let logger: {
    setContext: jest.Mock;
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    makeRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      upsert: jest.fn(),
    } as unknown as Repository<MakeEntity>;

    vehicleTypeRepository = {
      delete: jest.fn(),
      insert: jest.fn(),
    } as unknown as Repository<VehicleTypeEntity>;

    nhtsaClient = {
      getAllMakes: jest.fn(),
      getVehicleTypesForMakeId: jest.fn(),
    } as unknown as NhtsaClient;

    logger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new MakesService(
      makeRepository,
      vehicleTypeRepository,
      nhtsaClient,
      logger as any,
    );
  });

  describe('findAll', () => {
    it('should return all makes with vehicle types', async () => {
      const makes: MakeEntity[] = [
        {
          id: 440,
          name: 'Acura',
          vehicleTypes: [
            {
              id: 7,
              name: 'Multipurpose Passenger Vehicle (MPV)',
              makeId: 440,
            } as VehicleTypeEntity,
            {
              id: 2,
              name: 'Passenger Car',
              makeId: 440,
            } as VehicleTypeEntity,
          ],
        } as MakeEntity,
      ];

      jest
        .spyOn(makeRepository, 'find')
        .mockResolvedValue(makes);

      const result = await service.findAll();

      expect(makeRepository.find).toHaveBeenCalledWith({
        relations: {
          vehicleTypes: true,
        },
        order: {
          id: 'ASC',
        },
      });

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Acura',
          vehicleTypes: [
            {
              typeId: 2,
              typeName: 'Passenger Car',
            },
            {
              typeId: 7,
              typeName:
                'Multipurpose Passenger Vehicle (MPV)',
            },
          ],
        },
      ]);
    });

    it('should return an empty array when no makes exist', async () => {
      jest
        .spyOn(makeRepository, 'find')
        .mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should rethrow database errors', async () => {
      const error = new Error('Database error');

      jest
        .spyOn(makeRepository, 'find')
        .mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(
        'Database error',
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a make when found', async () => {
      const make: MakeEntity = {
        id: 440,
        name: 'Acura',
        vehicleTypes: [
          {
            id: 7,
            name: 'Multipurpose Passenger Vehicle (MPV)',
            makeId: 440,
          } as VehicleTypeEntity,
          {
            id: 2,
            name: 'Passenger Car',
            makeId: 440,
          } as VehicleTypeEntity,
        ],
      } as MakeEntity;

      jest
        .spyOn(makeRepository, 'findOne')
        .mockResolvedValue(make);

      const result = await service.findOne(440);

      expect(makeRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 440,
        },
        relations: {
          vehicleTypes: true,
        },
      });

      expect(result).toEqual({
        makeId: 440,
        makeName: 'Acura',
        vehicleTypes: [
          {
            typeId: 2,
            typeName: 'Passenger Car',
          },
          {
            typeId: 7,
            typeName:
              'Multipurpose Passenger Vehicle (MPV)',
          },
        ],
      });
    });

    it('should return null when make is not found', async () => {
      jest
        .spyOn(makeRepository, 'findOne')
        .mockResolvedValue(null);

      const result = await service.findOne(999999);

      expect(result).toBeNull();
    });

    it('should rethrow database errors', async () => {
      const error = new Error('Database error');

      jest
        .spyOn(makeRepository, 'findOne')
        .mockRejectedValue(error);

      await expect(service.findOne(440)).rejects.toThrow(
        'Database error',
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('ingest', () => {
    it('should ingest makes and vehicle types successfully', async () => {
      const makes = [
        {
          makeId: 440,
          makeName: 'Acura',
        },
        {
          makeId: 441,
          makeName: 'Alfa Romeo',
        },
      ];

      const vehicleTypesFor440 = [
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
        {
          typeId: 7,
          typeName:
            'Multipurpose Passenger Vehicle (MPV)',
        },
      ];

      const vehicleTypesFor441 = [
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
      ];

      jest
        .spyOn(nhtsaClient, 'getAllMakes')
        .mockResolvedValue(makes);

      jest
        .spyOn(
          nhtsaClient,
          'getVehicleTypesForMakeId',
        )
        .mockImplementation(async (makeId) => {
          if (makeId === 440) {
            return vehicleTypesFor440;
          }

          return vehicleTypesFor441;
        });

      jest
        .spyOn(makeRepository, 'upsert')
        .mockResolvedValue(undefined as any);

      jest
        .spyOn(vehicleTypeRepository, 'delete')
        .mockResolvedValue({
          affected: 0,
          raw: [],
        } as any);

      jest
        .spyOn(vehicleTypeRepository, 'insert')
        .mockResolvedValue({
          identifiers: [],
          generatedMaps: [],
          raw: [],
        } as any);

      const result = await service.ingest();

      expect(
        nhtsaClient.getAllMakes,
      ).toHaveBeenCalledTimes(1);

      expect(
        nhtsaClient.getVehicleTypesForMakeId,
      ).toHaveBeenCalledTimes(2);

      expect(
        makeRepository.upsert,
      ).toHaveBeenCalledTimes(2);

      expect(
        vehicleTypeRepository.delete,
      ).toHaveBeenCalledTimes(2);

      expect(
        vehicleTypeRepository.insert,
      ).toHaveBeenCalledTimes(2);

      expect(result.makesProcessed).toBe(2);
      expect(result.vehicleTypesProcessed).toBe(3);
    });

    it('should continue processing when one make fails', async () => {
      const makes = [
        {
          makeId: 440,
          makeName: 'Acura',
        },
        {
          makeId: 441,
          makeName: 'Alfa Romeo',
        },
      ];

      jest
        .spyOn(nhtsaClient, 'getAllMakes')
        .mockResolvedValue(makes);

      jest
        .spyOn(
          nhtsaClient,
          'getVehicleTypesForMakeId',
        )
        .mockImplementation(async (makeId) => {
          if (makeId === 440) {
            throw new Error(
              'NHTSA API request failed',
            );
          }

          return [
            {
              typeId: 2,
              typeName: 'Passenger Car',
            },
          ];
        });

      jest
        .spyOn(makeRepository, 'upsert')
        .mockResolvedValue(undefined as any);

      jest
        .spyOn(vehicleTypeRepository, 'delete')
        .mockResolvedValue({
          affected: 0,
          raw: [],
        } as any);

      jest
        .spyOn(vehicleTypeRepository, 'insert')
        .mockResolvedValue({
          identifiers: [],
          generatedMaps: [],
          raw: [],
        } as any);

      const result = await service.ingest();

      expect(result.makesProcessed).toBe(1);
      expect(result.vehicleTypesProcessed).toBe(1);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle makes with no vehicle types', async () => {
      const makes = [
        {
          makeId: 440,
          makeName: 'Acura',
        },
      ];

      jest
        .spyOn(nhtsaClient, 'getAllMakes')
        .mockResolvedValue(makes);

      jest
        .spyOn(
          nhtsaClient,
          'getVehicleTypesForMakeId',
        )
        .mockResolvedValue([]);

      jest
        .spyOn(makeRepository, 'upsert')
        .mockResolvedValue(undefined as any);

      jest
        .spyOn(vehicleTypeRepository, 'delete')
        .mockResolvedValue({
          affected: 0,
          raw: [],
        } as any);

      const insertSpy = jest
        .spyOn(vehicleTypeRepository, 'insert')
        .mockResolvedValue({
          identifiers: [],
          generatedMaps: [],
          raw: [],
        } as any);

      const result = await service.ingest();

      expect(result).toEqual({
        makesProcessed: 1,
        vehicleTypesProcessed: 0,
      });

      expect(
        vehicleTypeRepository.delete,
      ).toHaveBeenCalledWith({
        makeId: 440,
      });

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should return zero counts when no makes are returned', async () => {
      jest
        .spyOn(nhtsaClient, 'getAllMakes')
        .mockResolvedValue([]);

      const result = await service.ingest();

      expect(result).toEqual({
        makesProcessed: 0,
        vehicleTypesProcessed: 0,
      });

      expect(
        nhtsaClient.getVehicleTypesForMakeId,
      ).not.toHaveBeenCalled();

      expect(
        makeRepository.upsert,
      ).not.toHaveBeenCalled();
    });
  });
});