import { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

import { NhtsaClient } from '../src/makes/nhtsa.client';

describe('NhtsaClient', () => {
  let client: NhtsaClient;

  let cache: {
    get: jest.Mock;
    set: jest.Mock;
  };

  let logger: {
    setContext: jest.Mock;
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    logger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    configService = {
      get: jest.fn(
        (
          key: string,
          defaultValue?: unknown,
        ) => defaultValue,
      ),
    };

    client = new NhtsaClient(
      cache as unknown as Cache,
      logger as any,
      configService as unknown as ConfigService,
    );
  });

  describe('getAllMakes', () => {
    it('should return cached makes when available', async () => {
      const cachedMakes = [
        {
          makeId: 440,
          makeName: 'Acura',
        },
      ];

      cache.get.mockResolvedValue(cachedMakes);

      const result = await client.getAllMakes();

      expect(result).toEqual(cachedMakes);

      expect(cache.get).toHaveBeenCalledWith(
        'nhtsa:all-makes',
      );
    });

    it('should fetch makes when cache is empty', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
          <Results>
            <AllVehicleMakes>
              <Make_ID>440</Make_ID>
              <Make_Name>Acura</Make_Name>
            </AllVehicleMakes>

            <AllVehicleMakes>
              <Make_ID>441</Make_ID>
              <Make_Name>Alfa Romeo</Make_Name>
            </AllVehicleMakes>
          </Results>
        </Response>
      `;

      const requestSpy = jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      const result = await client.getAllMakes();

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Acura',
        },
        {
          makeId: 441,
          makeName: 'Alfa Romeo',
        },
      ]);

      expect(requestSpy).toHaveBeenCalledWith(
        '/GetAllMakes?format=xml',
      );

      expect(cache.set).toHaveBeenCalled();
    });

    it('should handle a single make response', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
          <Results>
            <AllVehicleMakes>
              <Make_ID>440</Make_ID>
              <Make_Name>Acura</Make_Name>
            </AllVehicleMakes>
          </Results>
        </Response>
      `;

      jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      const result = await client.getAllMakes();

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Acura',
        },
      ]);
    });

    it('should reject invalid makes response', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
        </Response>
      `;

      jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      await expect(
        client.getAllMakes(),
      ).rejects.toThrow(
        'Response.Results is missing',
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getVehicleTypesForMakeId', () => {
    it('should return cached vehicle types when available', async () => {
      const cachedTypes = [
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
      ];

      cache.get.mockResolvedValue(cachedTypes);

      const result =
        await client.getVehicleTypesForMakeId(440);

      expect(result).toEqual(cachedTypes);

      expect(cache.get).toHaveBeenCalledWith(
        'nhtsa:vehicle-types:440',
      );
    });

    it('should fetch and parse vehicle types', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
          <Results>
            <VehicleTypesForMakeIds>
              <VehicleTypeId>2</VehicleTypeId>
              <VehicleTypeName>
                Passenger Car
              </VehicleTypeName>
            </VehicleTypesForMakeIds>

            <VehicleTypesForMakeIds>
              <VehicleTypeId>7</VehicleTypeId>
              <VehicleTypeName>
                Multipurpose Passenger Vehicle (MPV)
              </VehicleTypeName>
            </VehicleTypesForMakeIds>
          </Results>
        </Response>
      `;

      const requestSpy = jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      const result =
        await client.getVehicleTypesForMakeId(440);

      expect(result).toEqual([
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
        {
          typeId: 7,
          typeName:
            'Multipurpose Passenger Vehicle (MPV)',
        },
      ]);

      expect(requestSpy).toHaveBeenCalledWith(
        '/GetVehicleTypesForMakeId/440?format=xml',
      );

      expect(cache.set).toHaveBeenCalled();
    });

    it('should handle a single vehicle type', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
          <Results>
            <VehicleTypesForMakeIds>
              <VehicleTypeId>2</VehicleTypeId>
              <VehicleTypeName>
                Passenger Car
              </VehicleTypeName>
            </VehicleTypesForMakeIds>
          </Results>
        </Response>
      `;

      jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      const result =
        await client.getVehicleTypesForMakeId(440);

      expect(result).toEqual([
        {
          typeId: 2,
          typeName: 'Passenger Car',
        },
      ]);
    });

    it('should return empty array when no vehicle types exist', async () => {
      cache.get.mockResolvedValue(undefined);

      const xml = `
        <Response>
          <Results>
            <Dummy />
          </Results>
        </Response>
      `;

      jest
        .spyOn(client as any, 'request')
        .mockResolvedValue(xml);

      const result =
        await client.getVehicleTypesForMakeId(440);

      expect(result).toEqual([]);

      expect(cache.set).toHaveBeenCalledWith(
        'nhtsa:vehicle-types:440',
        [],
        expect.any(Number),
      );
    });
  });

  describe('request', () => {
    it('should retry when the request fails', async () => {
      const requestSpy = jest.spyOn(
        (client as any).http,
        'get',
      );

      requestSpy
        .mockRejectedValueOnce(
          new Error('Network error'),
        )
        .mockResolvedValueOnce({
          status: 200,
          data: '<Response></Response>',
        });

      const result = await (
        client as any
      ).request('/test');

      expect(result).toBe(
        '<Response></Response>',
      );

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalled();
    });

    it(
      'should throw after all retries fail',
      async () => {
        const requestSpy = jest.spyOn(
          (client as any).http,
          'get',
        );

        requestSpy.mockRejectedValue(
          new Error('Network error'),
        );

        await expect(
          (client as any).request('/test'),
        ).rejects.toThrow('Network error');

        expect(requestSpy).toHaveBeenCalledTimes(4);
        expect(logger.error).toHaveBeenCalled();
      },
      10000,
    );
  });
});