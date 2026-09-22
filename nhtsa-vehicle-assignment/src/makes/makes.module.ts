import {
  Module
} from '@nestjs/common';

import {
  TypeOrmModule
} from '@nestjs/typeorm';

import {
  MakeEntity
} from './make.entity';

import {
  VehicleTypeEntity
} from './vehicle-type.entity';

import {
  MakesResolver
} from './makes.resolver';

import {
  MakesService
} from './makes.service';

import {
  NhtsaClient
} from './nhtsa.client';

@Module({

  imports: [
    TypeOrmModule.forFeature([
      MakeEntity,
      VehicleTypeEntity
    ])
  ],

  providers: [
    MakesResolver,
    MakesService,
    NhtsaClient
  ],

  exports: [
    MakesService
  ]
})
export class MakesModule {}