import { NhtsaClient } from '../src/makes/nhtsa.client';

describe('NhtsaClient', () => {
  let client: NhtsaClient;

  beforeEach(() => {
    client = new NhtsaClient();

    (client as any).http = {
      get: jest.fn(),
    };
  });

  describe('getAllMakes', () => {
    it('should parse all vehicle makes', async () => {
      const xml = `
        <Response>
          <Count>2</Count>
          <Message>Response returned successfully</Message>
          <Results>
            <AllVehicleMakes>
              <Make_ID>440</Make_ID>
              <Make_Name>Test Make</Make_Name>
            </AllVehicleMakes>
            <AllVehicleMakes>
              <Make_ID>441</Make_ID>
              <Make_Name>Another Make</Make_Name>
            </AllVehicleMakes>
          </Results>
        </Response>
      `;

      (client as any).http.get.mockResolvedValue({
        data: xml,
      });

      const result = await client.getAllMakes();

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Test Make',
        },
        {
          makeId: 441,
          makeName: 'Another Make',
        },
      ]);
    });
  });

  describe('getVehicleTypesForMakeId', () => {
    it('should parse vehicle types for a make', async () => {
      const xml = `
        <Response>
          <Count>2</Count>
          <Message>Response returned successfully</Message>
          <SearchCriteria>Make ID: 440</SearchCriteria>
          <Results>
            <VehicleTypesForMakeIds>
              <VehicleTypeId>2</VehicleTypeId>
              <VehicleTypeName>Passenger Car</VehicleTypeName>
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

      (client as any).http.get.mockResolvedValue({
        data: xml,
      });

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
    });
  });

  describe('retry handling', () => {
    it('should retry when the request fails', async () => {
      const xml = `
        <Response>
          <Results>
            <AllVehicleMakes>
              <Make_ID>440</Make_ID>
              <Make_Name>Test Make</Make_Name>
            </AllVehicleMakes>
          </Results>
        </Response>
      `;

      (client as any).http.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: xml,
        });

      const result = await client.getAllMakes();

      expect(
        (client as any).http.get,
      ).toHaveBeenCalledTimes(2);

      expect(result).toEqual([
        {
          makeId: 440,
          makeName: 'Test Make',
        },
      ]);
    });
  });
});