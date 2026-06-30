import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ResourcePackageService } from './resource-package.service';
import { AdminExercisesController } from './admin-exercises.controller';
import { AdminExercisesService } from './admin-exercises.service';
import { ExerciseAssetsService } from './exercise-assets.service';

@Module({
  controllers: [ExercisesController, AdminExercisesController],
  providers: [ResourcePackageService, AdminExercisesService, ExerciseAssetsService],
})
export class ExercisesModule {}
