import { InstallableSegmentService, SegmentDefinitions } from './installable-segment-service.js';
import { vendorSegment } from './vendor-segment.js';

const segmentDefinitions: SegmentDefinitions = [];

export const installableSegmentService = new InstallableSegmentService(segmentDefinitions);
