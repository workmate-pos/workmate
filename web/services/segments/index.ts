import { InstallableSegmentService, SegmentDefinitions } from './installable-segment-service.js';

const segmentDefinitions: SegmentDefinitions = [];

export const installableSegmentService = new InstallableSegmentService(segmentDefinitions);
