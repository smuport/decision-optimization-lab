import { Module } from '@nestjs/common';
import { RunnerAdapterModule } from '../runner-adapter/runner-adapter.module';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [RunnerAdapterModule],
  controllers: [SubmissionsController],
})
export class SubmissionsModule {}

