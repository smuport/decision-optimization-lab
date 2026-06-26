import { Module } from '@nestjs/common';
import { RunnerAdapterService } from './runner-adapter.service';

@Module({
  providers: [RunnerAdapterService],
  exports: [RunnerAdapterService],
})
export class RunnerAdapterModule {}

