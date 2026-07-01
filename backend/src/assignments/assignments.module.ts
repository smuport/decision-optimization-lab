import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { StudentAssignmentsController, TeacherAssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({ imports: [ExercisesModule], controllers: [TeacherAssignmentsController, StudentAssignmentsController], providers: [AssignmentsService], exports: [AssignmentsService] })
export class AssignmentsModule {}
