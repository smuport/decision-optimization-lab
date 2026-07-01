import { Module } from '@nestjs/common';
import { RunnerAdapterModule } from '../runner-adapter/runner-adapter.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [RunnerAdapterModule, AssignmentsModule],
  controllers: [SubmissionsController],
})
export class SubmissionsModule {}
