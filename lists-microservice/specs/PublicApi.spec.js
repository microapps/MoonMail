import './specHelper';
import chakram from 'chakram';
import wait from '../src/lib/utils/wait';

const expect = chakram.expect;

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
const apiKey = process.env.TEST_PUBLIC_API_KEY;

describe('Public Api', () => {
  const testList = 'cjanp4zul000101nr0dyq8fpq';
  function createRecipientPayload() {
    const recipientEmail = `test-recipient-${Math.floor((Math.random() * 100000000) + 1)}@example.com`;
    return {
      recipient: {
        email: recipientEmail,
        status: 'awaitingConfirmation',
        metadata: {
          name: 'Test name',
          surname: 'Test surname'
        }
      }
    };
  }
  describe('Recipients Public Api', () => {
    let recipientId;

    describe('Operations', () => {
      it('creates recipients', async () => {
        const recipientPayload = createRecipientPayload();
        const url = `${baseUrl}/${testList}/recipients`;
        const response = await chakram.post(url, recipientPayload, { json: true, headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(202);
        expect(response.body.recipient).to.exist;
        return chakram.wait();
      });

      it('lists all the recipients allowing to filter', async () => {
        const url = `${baseUrl}/${testList}/recipients`;
        const response = await chakram.get(url, { headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(200);
        expect(response.body.items).to.exist;
        return chakram.wait();
      });

      it('gets a recipient by its id', async () => {
        let url;
        let response;
        const recipientPayload = createRecipientPayload();
        url = `${baseUrl}/${testList}/recipients`;
        response = await chakram.post(url, recipientPayload, { json: true, headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(202);
        recipientId = response.body.recipient.id;

        await wait(5000);
        url = `${baseUrl}/${testList}/recipients/${recipientId}`;
        response = await chakram.get(url, { headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(200);
        expect(response.body.id).to.exist;
        return chakram.wait();
      });

      it('updates a recipient with new data', async () => {
        let url;
        let response;
        const recipientPayload = createRecipientPayload();
        url = `${baseUrl}/${testList}/recipients`;
        response = await chakram.post(url, recipientPayload, { json: true, headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(202);
        recipientId = response.body.recipient.id;

        await wait(5000);
        url = `${baseUrl}/${testList}/recipients/${recipientId}`;
        response = await chakram.put(url, { status: 'subscribed' }, { headers: { 'x-api-key': apiKey } });
        expect(response).to.have.status(202);

        await wait(5000);
        url = `${baseUrl}/${testList}/recipients/${recipientId}`;
        response = await chakram.get(url, { headers: { 'x-api-key': apiKey } });
        expect(response.body.status).to.equals('subscribed');

        return chakram.wait();
      });
    });
  });
});
