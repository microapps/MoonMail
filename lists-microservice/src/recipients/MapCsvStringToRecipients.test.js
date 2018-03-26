import fs from 'fs';
import path from 'path';
import '../lib/specHelper';
import CsvToRecipientsMapper from './MapCsvStringToRecipients';

const validEmailsCsvContent = fs.readFileSync(path.resolve(path.resolve(__dirname, 'fixtures/250_valid_recipients.csv'))).toString();
const validEmailsWithSystemMetadataCsvContent = fs.readFileSync(path.resolve(path.resolve(__dirname, 'fixtures/250_valid_recipients_with_system_metadata.csv'))).toString();
const validEmailsCsvBomContent = fs.readFileSync(path.resolve(path.resolve(__dirname, 'fixtures/250_valid_recipients_with_bom.csv'))).toString();
const with3InvalidEmailsCsvContent = fs.readFileSync(path.resolve(path.resolve(__dirname, 'fixtures/247_valid_3_invalid_recipients.csv'))).toString();
const with8DuplicatedEmailsCsvContent = fs.readFileSync(path.resolve(path.resolve(__dirname, 'fixtures/242_valid_8_duplicated_recipients.csv'))).toString();
const userId = 'user-id';
const listId = 'list-id';
const metadataMapping = {
  Name: 'firstName',
  email: 'email',
  Country: 'country',
  'Last Name': 'surname',
  'Date of Birth': 'dob'
};
const mappingWithSystemMetadata = Object.assign({}, metadataMapping, { 'Country Code': 'systemMedatadata__countryCode' });
const expectValidRecipient = (recipient) => {
  expect(recipient).to.have.property('email').that.is.a('string');
  expect(recipient).to.have.property('userId', userId);
  expect(recipient).to.have.property('listId', listId);
  const metadata = recipient.metadata;
  expect(metadata).to.have.property('firstName').that.is.a('string');
  expect(metadata).to.have.property('surname').that.is.a('string');
  expect(metadata).to.have.property('country').that.is.a('string');
  expect(metadata).to.have.property('dob').that.is.a('string');
};
const expectValidRecipientWithSystemMetadata = (recipient) => {
  expectValidRecipient(recipient);
  expect(recipient.systemMetadata).to.have.property('countryCode').that.is.a('string');
};

describe('CsvToRecipientsMapper', () => {
  describe('.execute()', () => {
    it('map CSV contents to recipients objects', async () => {
      const params = { csvString: validEmailsCsvContent, userId, listId, headerMapping: metadataMapping };
      const result = await CsvToRecipientsMapper.execute(params);
      expect(result).to.have.lengthOf(250);
      result.forEach(recipient => expectValidRecipient(recipient));
    });
    it('skip non valid emails', async () => {
      const params = { csvString: with3InvalidEmailsCsvContent, userId, listId, headerMapping: metadataMapping };
      const result = await CsvToRecipientsMapper.execute(params);
      expect(result).to.have.lengthOf(247);
      result.forEach(recipient => expectValidRecipient(recipient));
    });
    it('deduplicate emails', async () => {
      const params = { csvString: with8DuplicatedEmailsCsvContent, userId, listId, headerMapping: metadataMapping };
      const result = await CsvToRecipientsMapper.execute(params);
      expect(result).to.have.lengthOf(242);
      result.forEach(recipient => expectValidRecipient(recipient));
    });
    it('should handle files with BOM', async () => {
      const params = { csvString: validEmailsCsvBomContent, userId, listId, headerMapping: metadataMapping };
      const result = await CsvToRecipientsMapper.execute(params);
      expect(result).to.have.lengthOf(250);
      result.forEach(recipient => expectValidRecipient(recipient));
    });
    it('should handle system metadata', async () => {
      const params = { csvString: validEmailsWithSystemMetadataCsvContent, userId, listId, headerMapping: mappingWithSystemMetadata };
      const result = await CsvToRecipientsMapper.execute(params);
      expect(result).to.have.lengthOf(250);
      result.forEach(recipient => expectValidRecipientWithSystemMetadata(recipient));
    });
  });
});
