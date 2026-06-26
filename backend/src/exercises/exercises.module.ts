import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ResourcePackageService } from './resource-package.service';

@Module({
  controllers: [ExercisesController],
  providers: [ResourcePackageService],
})
export class ExercisesModule {}
