import PublicHttpApi from './src/PublicHttpApi';
import RecipientCommands from './src/RecipientCommands';
import EventProcessors from './src/EventProcessors';
import RecipientQueries from './src/RecipientQueries';
import SegmentCommands from './src/SegmentCommands';
import SegmentQueries from './src/SegmentQueries';

// The public HTTP Api endpoints
module.exports.createRecipient = PublicHttpApi.createRecipient;
module.exports.updateRecipient = PublicHttpApi.updateRecipient;
module.exports.getRecipient = PublicHttpApi.getRecipient;
module.exports.listRecipients = PublicHttpApi.listRecipients;
module.exports.getAllLists = PublicHttpApi.getAllLists;


// Recipient related commands
module.exports.importRecipientsCsvFromS3 = RecipientCommands.importRecipientsCsvFromS3;

// Recipient event processors
// module.exports.recipientImportedProcessor = RecipientEventProcessors.recipientImportedProcessor;
// module.exports.recipientCreatedProcessor = RecipientEventProcessors.recipientCreatedProcessor;
// module.exports.recipientUpdatedProcessor = RecipientEventProcessors.recipientUpdatedProcessor;
module.exports.eventStreamProcessor = EventProcessors.eventStreamProcessor;
module.exports.syncRecipientStreamWithES = EventProcessors.syncRecipientStreamWithES;

// Recipient queries
module.exports.searchRecipientsRaw = RecipientQueries.searchRecipients;

// SegmentCommands
module.exports.createSegment = SegmentCommands.createSegment;
module.exports.updateSegment = SegmentCommands.updateSegment;

// Segment queries
module.exports.getSegment = SegmentQueries.getSegment;
module.exports.listSegmentMembers = SegmentQueries.listSegmentMembers;
module.exports.listSegments = SegmentQueries.listSegments;

