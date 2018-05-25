import { User } from '../../../lib/models/user';
import '../../../lib/spec_helper';
import FunctionsClient from '../../../lib/functions_client';
import respond from './action.js';
import * as decrypt from '../../../lib/auth-token-decryptor';


describe('Template marketplace REST API', () => {
  const userId = 'some-user-id';

  beforeEach(() => {
    sinon.stub(decrypt, 'default').resolves({ sub: userId });
  });

  afterEach(() => {
    decrypt.default.restore();
  });

  describe('create template', () => {
    const name = 'my tempalte';
    const description = 'Some description';
    const html = '<h1>Hello world</h1>';
    const body = JSON.stringify({ a: 1 });
    const price = 1;
    const category = 'sales';
    const tags = ['sales', 'ecommerce'];
    const template = { name, description, html, body, price, category, tags };
    let event;
    const createTemplateFunction = 'createTemplate';
    process.env.CREATE_TEMPLATE_FUNCTION = createTemplateFunction;

    context('when the event is valid', () => {
      before(() => {
        event = { template, action: 'create', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').resolves({});
      });
      after(() => {
        FunctionsClient.execute.restore();
      });

      it('creates the template', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(createTemplateFunction);
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the event is not valid', () => {
      before(() => {
        event = { action: 'create', authToken: '123' };
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    context('when the upstream service breaks', () => {
      before(() => {
        event = { action: 'create', authToken: '123', template: { name: 'My template' } };
        sinon.stub(FunctionsClient, 'execute').rejects('error');
      });
      after(() => {
        FunctionsClient.execute.restore();
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(createTemplateFunction);
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });
  });

  describe('get template', () => {
    const templateId = 'some-template-id';
    let event;
    const getTemplateFunction = 'getTemplate';
    process.env.GET_TEMPLATE_FUNCTION = getTemplateFunction;


    context('when the event is valid', () => {
      before(() => {
        event = { templateId, action: 'show', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').resolves({});
        sinon.stub(User, 'get').resolves({});
      });
      after(() => {
        FunctionsClient.execute.restore();
        User.get.restore();
      });

      it('gets the template', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(getTemplateFunction);
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the upstream service breaks', () => {
      before(() => {
        event = { templateId, action: 'show', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').rejects('error');
        sinon.stub(User, 'get').resolves({});
      });
      after(() => {
        FunctionsClient.execute.restore();
        User.get.restore();
      });

      it('gets the template', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(getTemplateFunction);
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    context('when the event is not valid', () => {
      before(() => {
        event = { action: 'show', authToken: '123' };
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });
  });

  describe('list templates', () => {
    let event;
    const listTemplatesFunction = 'listTemplates';
    process.env.LIST_TEMPLATES_FUNCTION = listTemplatesFunction;

    context('when the event is valid', () => {
      before(() => {
        event = { action: 'list', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').resolves({});
      });
      after(() => {
        FunctionsClient.execute.restore();
      });
      it('lists the templates', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(listTemplatesFunction);
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the upstream service breaks', () => {
      before(() => {
        event = { action: 'list', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').rejects('error');
      });
      after(() => {
        FunctionsClient.execute.restore();
      });
      it('lists the templates', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(listTemplatesFunction);
          expect(err).to.exist;
          expect(result).to.not.exist;
          done();
        });
      });
    });
  });

  describe('update template', () => {
    const templateId = 'some-template-id';
    const name = 'my tempalte';
    const description = 'Some description';
    const html = '<h1>Hello world</h1>';
    const body = JSON.stringify({ a: 1 });
    const price = 1;
    const category = 'sales';
    const tags = ['sales', 'ecommerce'];
    const template = { name, description, html, body, price, category, tags };
    let event;
    const updateTemplateFunction = 'updateTemplate';
    process.env.UPDATE_TEMPLATE_FUNCTION = updateTemplateFunction;

    context('when the event is valid', () => {
      before(() => {
        event = { template, templateId, action: 'update', authToken: '123' };
        sinon.stub(FunctionsClient, 'execute').resolves({});
      });

      after(() => {
        FunctionsClient.execute.restore();
      });

      it('updates the template', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(updateTemplateFunction);
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the upstream service breaks', () => {
      before(() => {
        event = { action: 'update', authToken: '123', template, templateId };
        sinon.stub(FunctionsClient, 'execute').rejects('error');
      });
      after(() => {
        FunctionsClient.execute.restore();
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(FunctionsClient.execute).to.have.been.called;
          expect(FunctionsClient.execute.lastCall.args[0]).to.equals(updateTemplateFunction);
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    context('when the event is not valid', () => {
      before(() => {
        event = { action: 'update', authToken: '123' };
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });
  });
});
