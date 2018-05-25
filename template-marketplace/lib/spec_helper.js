import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';


const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

global.sinon = sinon;
global.expect = expect;
global.chai = chai;
