// import chai from "chai";
import sinon from "sinon";
import handler from "./handler";

// const { expect } = chai;

describe("handler", () => {
  describe(".version", () => {
    it("return the current version", done => {
      //
      sinon.stub();
      handler({}, {}, err => {
        if (err) return done(err);
        return done();
      });
    });
  });
});
