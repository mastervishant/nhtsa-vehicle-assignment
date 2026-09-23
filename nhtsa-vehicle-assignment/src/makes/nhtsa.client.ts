import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PinoLogger } from 'nestjs-pino';
import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';

import {
  NhtsaMake,
  NhtsaVehicleType,
} from './nhtsa.types';

@Injectable()
export class NhtsaClient {
  private readonly http: AxiosInstance;
  private readonly parser: XMLParser;

  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly cacheTtl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,

    private readonly logger: PinoLogger,

    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(NhtsaClient.name);

    this.baseUrl = this.configService.get<string>(
      'nhtsa.baseUrl',
      'https://vpic.nhtsa.dot.gov/api/vehicles',
    );

    this.timeout = this.configService.get<number>(
      'nhtsa.timeoutMs',
      30000,
    );

    this.retries = this.configService.get<number>(
      'nhtsa.retries',
      3,
    );

    this.cacheTtl = this.configService.get<number>(
      'cache.ttlSeconds',
      3600,
    );

    this.parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    });

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        Accept: 'application/xml',
      },
    });

    this.logger.debug(
      {
        baseUrl: this.baseUrl,
        timeoutMs: this.timeout,
        retries: this.retries,
        cacheTtlSeconds: this.cacheTtl,
      },
      'NHTSA client initialized',
    );
  }

  /**
   * Fetch all vehicle makes from NHTSA.
   */
  async getAllMakes(): Promise<NhtsaMake[]> {
    const cacheKey = 'nhtsa:all-makes';

    try {
      const cached =
        await this.cache.get<NhtsaMake[]>(cacheKey);

      if (cached) {
        this.logger.debug(
          {
            cacheKey,
            count: cached.length,
          },
          'NHTSA makes cache hit',
        );

        return cached;
      }

      this.logger.debug(
        {
          cacheKey,
        },
        'NHTSA makes cache miss',
      );

      const xml = await this.request(
        '/GetAllMakes?format=xml',
      );

      const parsed = this.parseXml(
        xml,
        'getAllMakes',
      );

      const results = parsed?.Response?.Results;

      if (!results) {
        const error = new Error(
          'Invalid NHTSA response: Response.Results is missing',
        );

        this.logger.error(
          {
            err: error,
            operation: 'getAllMakes',
          },
          'Invalid NHTSA makes response',
        );

        throw error;
      }

      const rawMakes = results.AllVehicleMakes;

      if (!rawMakes) {
        const error = new Error(
          'Invalid NHTSA response: AllVehicleMakes is missing',
        );

        this.logger.error(
          {
            err: error,
            operation: 'getAllMakes',
          },
          'Invalid NHTSA makes response',
        );

        throw error;
      }

      const makes = Array.isArray(rawMakes)
        ? rawMakes
        : [rawMakes];

      const parsedMakes: NhtsaMake[] = makes
        .map((make: any) => ({
          makeId: Number(make.Make_ID),
          makeName: String(
            make.Make_Name ?? '',
          ).trim(),
        }))
        .filter(
          (make: NhtsaMake) =>
            Number.isFinite(make.makeId) &&
            make.makeId > 0 &&
            make.makeName.length > 0,
        );

      this.logger.info(
        {
          count: parsedMakes.length,
        },
        'Fetched NHTSA makes',
      );

      await this.cache.set(
        cacheKey,
        parsedMakes,
        this.cacheTtl,
      );

      this.logger.debug(
        {
          cacheKey,
          count: parsedMakes.length,
          ttlSeconds: this.cacheTtl,
        },
        'NHTSA makes cached',
      );

      return parsedMakes;
    } catch (error) {
      this.logger.error(
        {
          err: error,
          cacheKey,
          operation: 'getAllMakes',
        },
        'Failed to fetch NHTSA makes',
      );

      throw error;
    }
  }

  /**
   * Fetch vehicle types for a specific make.
   */
  async getVehicleTypesForMakeId(
    makeId: number,
  ): Promise<NhtsaVehicleType[]> {
    const cacheKey =
      `nhtsa:vehicle-types:${makeId}`;

    try {
      const cached =
        await this.cache.get<NhtsaVehicleType[]>(
          cacheKey,
        );

      if (cached) {
        this.logger.debug(
          {
            makeId,
            cacheKey,
            count: cached.length,
          },
          'NHTSA vehicle types cache hit',
        );

        return cached;
      }

      this.logger.debug(
        {
          makeId,
          cacheKey,
        },
        'NHTSA vehicle types cache miss',
      );

      const xml = await this.request(
        `/GetVehicleTypesForMakeId/${makeId}?format=xml`,
      );

      const parsed = this.parseXml(
        xml,
        'getVehicleTypesForMakeId',
        makeId,
      );

      const results = parsed?.Response?.Results;

      if (!results) {
        const error = new Error(
          'Invalid NHTSA response: Response.Results is missing',
        );

        this.logger.error(
          {
            err: error,
            makeId,
            operation: 'getVehicleTypesForMakeId',
          },
          'Invalid NHTSA vehicle types response',
        );

        throw error;
      }

      const rawTypes =
        results.VehicleTypesForMakeIds;

      /*
       * No vehicle types is a valid NHTSA response.
       */
      if (!rawTypes) {
        this.logger.debug(
          {
            makeId,
          },
          'NHTSA returned no vehicle types',
        );

        const emptyResult: NhtsaVehicleType[] = [];

        await this.cache.set(
          cacheKey,
          emptyResult,
          this.cacheTtl,
        );

        return emptyResult;
      }

      const types = Array.isArray(rawTypes)
        ? rawTypes
        : [rawTypes];

      const parsedTypes: NhtsaVehicleType[] =
        types
          .map((type: any) => ({
            typeId: Number(
              type.VehicleTypeId,
            ),
            typeName: String(
              type.VehicleTypeName ?? '',
            ).trim(),
          }))
          .filter(
            (type: NhtsaVehicleType) =>
              Number.isFinite(type.typeId) &&
              type.typeId > 0 &&
              type.typeName.length > 0,
          );

      this.logger.info(
        {
          makeId,
          count: parsedTypes.length,
        },
        'Fetched NHTSA vehicle types',
      );

      await this.cache.set(
        cacheKey,
        parsedTypes,
        this.cacheTtl,
      );

      this.logger.debug(
        {
          makeId,
          cacheKey,
          count: parsedTypes.length,
          ttlSeconds: this.cacheTtl,
        },
        'NHTSA vehicle types cached',
      );

      return parsedTypes;
    } catch (error) {
      this.logger.error(
        {
          err: error,
          makeId,
          cacheKey,
          operation: 'getVehicleTypesForMakeId',
        },
        'Failed to fetch NHTSA vehicle types',
      );

      throw error;
    }
  }

  /**
   * Parse an NHTSA XML response.
   *
   * Transformation errors are logged with the
   * operation and make ID where applicable.
   */
  private parseXml(
    xml: string,
    operation: string,
    makeId?: number,
  ): any {
    try {
      return this.parser.parse(xml);
    } catch (error) {
      this.logger.error(
        {
          err: error,
          operation,
          makeId,
        },
        'Failed to transform NHTSA XML response',
      );

      throw error;
    }
  }

  /**
   * Perform an HTTP GET with timeout and retries.
   */
  private async request(
    path: string,
  ): Promise<string> {
    let lastError: unknown;

    const totalAttempts = this.retries + 1;

    for (
      let attempt = 1;
      attempt <= totalAttempts;
      attempt++
    ) {
      try {
        this.logger.debug(
          {
            path,
            attempt,
            totalAttempts,
            timeoutMs: this.timeout,
          },
          'NHTSA API request started',
        );

        const response =
          await this.http.get<string>(path, {
            responseType: 'text',
          });

        this.logger.debug(
          {
            path,
            status: response.status,
            attempt,
          },
          'NHTSA API request successful',
        );

        return response.data;
      } catch (error) {
        lastError = error;

        const status =
          axios.isAxiosError(error)
            ? error.response?.status
            : undefined;

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        this.logger.warn(
          {
            path,
            attempt,
            totalAttempts,
            status,
            error: message,
          },
          'NHTSA API request failed',
        );

        if (attempt < totalAttempts) {
          const delay = Math.min(
            1000 * 2 ** (attempt - 1),
            10000,
          );

          this.logger.debug(
            {
              path,
              delayMs: delay,
              nextAttempt: attempt + 1,
            },
            'Waiting before NHTSA API retry',
          );

          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      {
        path,
        attempts: totalAttempts,
        err: lastError,
      },
      'NHTSA API request permanently failed',
    );

    throw lastError;
  }

  private sleep(
    ms: number,
  ): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, ms),
    );
  }
}