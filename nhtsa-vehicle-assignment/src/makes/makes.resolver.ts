import {
  Args,
  Int,
  Query,
  Resolver
} from '@nestjs/graphql';

import {
  MakeDto
} from './dto/make.dto';

import {
  MakesService
} from './makes.service';

@Resolver(
  () => MakeDto
)
export class MakesResolver {

  constructor(
    private readonly makesService:
      MakesService
  ) {}

  @Query(
    () => [MakeDto]
  )
  async makes(): Promise<MakeDto[]> {

    return this.makesService.findAll();
  }

  @Query(
    () => MakeDto,
    {
      nullable: true
    }
  )
  async make(
    @Args(
      'makeId',
      {
        type: () => Int
      }
    )
    makeId: number
  ): Promise<MakeDto | null> {

    return this.makesService.findOne(
      makeId
    );
  }
}