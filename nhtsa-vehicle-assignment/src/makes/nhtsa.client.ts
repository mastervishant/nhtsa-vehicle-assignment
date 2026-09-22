import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';

import {
  NhtsaMake,
  NhtsaVehicleType,
} from './nhtsa.types';

@Injectable()
export class NhtsaClient {
  private readonly logger = new Logger(NhtsaClient.name);

  private readonly http: AxiosInstance;

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  private readonly baseUrl =
    process.env.NHTSA_BASE_URL ??
    'https://vpic.nhtsa.dot.gov/api/vehicles';

  private readonly timeout = Number(
    process.env.NHTSA_TIMEOUT_MS ?? 30000,
  );

  private readonly retries = Number(
    process.env.NHTSA_RETRIES ?? 3,
  );

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        Accept: 'application/xml',
      },
    });
  }

  async getAllMakes(): Promise<NhtsaMake[]> {
    const xml = await this.request(
      '/GetAllMakes?format=xml',
    );

    const parsed = this.parser.parse(xml);

    /*
     * NHTSA response:
     *
     * <Response>
     *   <Count>...</Count>
     *   <Message>...</Message>
     *   <SearchCriteria>...</SearchCriteria>
     *   <Results>
     *     <AllVehicleMakes>
     *       <Make_ID>...</Make_ID>
     *       <Make_Name>...</Make_Name>
     *     </AllVehicleMakes>
     *   </Results>
     * </Response>
     */

    const results = parsed?.Response?.Results;

    if (!results) {
      this.logger.error(
        'NHTSA response does not contain Response.Results',
      );

      this.logger.debug(
        JSON.stringify(parsed, null, 2),
      );

      return [];
    }

    const rawMakes = results.AllVehicleMakes;

    if (!rawMakes) {
      this.logger.error(
        'NHTSA response does not contain Results.AllVehicleMakes',
      );

      this.logger.debug(
        JSON.stringify(results, null, 2),
      );

      return [];
    }

    const makes = Array.isArray(rawMakes)
      ? rawMakes
      : [rawMakes];

    return makes
      .map((make: any) => ({
        makeId: Number(make.Make_ID),
        makeName: String(make.Make_Name ?? '').trim(),
      }))
      .filter(
        (make) =>
          Number.isFinite(make.makeId) &&
          make.makeId > 0 &&
          make.makeName.length > 0,
      );
  }

  async getVehicleTypesForMakeId(
    makeId: number,
  ): Promise<NhtsaVehicleType[]> {
    const xml = await this.request(
      `/GetVehicleTypesForMakeId/${makeId}?format=xml`,
    );

    const parsed = this.parser.parse(xml);

    /*
     * NHTSA response:
     *
     * <Response>
     *   ...
     *   <Results>
     *     <VehicleTypesForMakeIds>
     *       <VehicleTypeId>2</VehicleTypeId>
     *       <VehicleTypeName>Passenger Car</VehicleTypeName>
     *     </VehicleTypesForMakeIds>
     *   </Results>
     * </Response>
     */

    const results = parsed?.Response?.Results;

    if (!results) {
      return [];
    }

    const rawTypes =
      results.VehicleTypesForMakeIds;

    if (!rawTypes) {
      return [];
    }

    const types = Array.isArray(rawTypes)
      ? rawTypes
      : [rawTypes];

    return types
      .map((type: any) => ({
        typeId: Number(type.VehicleTypeId),
        typeName: String(
          type.VehicleTypeName ?? '',
        ).trim(),
      }))
      .filter(
        (type) =>
          Number.isFinite(type.typeId) &&
          type.typeId > 0 &&
          type.typeName.length > 0,
      );
  }

  private async request(path: string): Promise<string> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= this.retries + 1;
      attempt++
    ) {
      try {
        const response =
          await this.http.get<string>(path, {
            responseType: 'text',
          });

        return response.data;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `NHTSA request failed: ${path} ` +
            `(attempt ${attempt}/${this.retries + 1})`,
        );

        if (attempt <= this.retries) {
          const delay =
            Math.min(
              1000 * 2 ** (attempt - 1),
              10000,
            );

          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, ms),
    );
  }
}