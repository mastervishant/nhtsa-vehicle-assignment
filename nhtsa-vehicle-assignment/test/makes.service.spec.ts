import { MakesService } from '../src/makes/makes.service';

describe('MakesService', () => {
  let service: MakesService;

  const makeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
  };

  const vehicleTypeRepository = {
    delete: jest.fn(),
    insert: jest.fn(),
  };

  const nhtsaClient = {
    getAllMakes: jest.fn(),
    getVehicleTypesForMakeId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new MakesService(
      makeRepository as any,
      vehicleTypeRepository as any,
      nhtsaClient as any,
    );
  });

  describe('findAll', () => {
    it('should return all makes with vehicle types', async () => {
      makeRepository.find.mockResolvedValue([
        {
          id: 440,
          name: 'Test Make',
          vehicleTypes: [
            {
              id: 7,
              name: 'Multipurpose Passenger Vehicle (MPV)',
            },
            {
              id: 2,
              name: 'Passenger Car',
            },
          ],
        },
      ]);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Test Make',
          vehicleTypes: [
            {
              typeId: 2,
              typeName: 'Passenger Car',
            },
            {
              typeId: 7,
              typeName: 'Multipurpose Passenger Vehicle (MPV)',
            },
          ],
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a make by id', async () => {
      makeRepository.findOne.mockResolvedValue({
        id: 440,
        name: 'Test Make',
        vehicleTypes: [
          {
            id: 2,
            name: 'Passenger Car',
          },
        ],
      });

      const result = await service.findOne(440);

      expect(result).toEqual({
        makeId: 440,
        makeName: 'Test Make',
        vehicleTypes: [
          {
            typeId: 2,
            typeName: 'Passenger Car',
          },
        ],
      });
    });

    it('should return null when make does not exist', async () => {
      makeRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('ingest', () => {
    it('should fetch makes and persist their vehicle types', async () => {
      nhtsaClient.getAllMakes.mockResolvedValue([
        {
          makeId: 440,
          makeName: 'Test Make',
        },
      ]);

      nhtsaClient.getVehicleTypesForMakeId.mockResolvedValue([
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
        {
          typeId: 7,
          typeName: 'Multipurpose Passenger Vehicle (MPV)',
        },
      ]);

      makeRepository.upsert.mockResolvedValue(undefined);
      vehicleTypeRepository.delete.mockResolvedValue(undefined);
      vehicleTypeRepository.insert.mockResolvedValue(undefined);

      const result = await service.ingest();

      expect(nhtsaClient.getAllMakes).toHaveBeenCalledTimes(1);
      expect(
        nhtsaClient.getVehicleTypesForMakeId,
      ).toHaveBeenCalledWith(440);

      expect(makeRepository.upsert).toHaveBeenCalledWith(
        {
          id: 440,
          name: 'Test Make',
        },
        ['id'],
      );

      expect(vehicleTypeRepository.delete).toHaveBeenCalledWith({
        makeId: 440,
      });

      expect(vehicleTypeRepository.insert).toHaveBeenCalledWith([
        {
          id: 2,
          name: 'Passenger Car',
          makeId: 440,
        },
        {
          id: 7,
          name: 'Multipurpose Passenger Vehicle (MPV)',
        },
      ].map((item) => ({
        ...item,
        makeId: 440,
      })));

      expect(result).toEqual({
        makesProcessed: 1,
        vehicleTypesProcessed: 2,
      });
    });
  });
});