import expect from 'expect.js';
import { stub, spy } from 'sinon';

import TransactionManager from '../../src/web-auth/transaction-manager';
import objectHelper from '../../src/helper/object';
import random from '../../src/helper/random';
import storage from '../../src/helper/storage';

context('TransactionManager', function() {
  beforeEach(function() {
    this.tm = new TransactionManager();
  });
  context('process', function() {
    beforeEach(function() {
      stub(TransactionManager.prototype, 'generateTransaction', function(
        appState,
        state,
        nonce,
        lastUsedConnection
      ) {
        return {
          state: state || 'randomState',
          nonce: nonce || 'randomNonce',
          lastUsedConnection: lastUsedConnection
        };
      });
    });
    afterEach(function() {
      TransactionManager.prototype.generateTransaction.restore();
    });
    it('throws when responseType is not available', function() {
      var _this = this;
      expect(function() {
        _this.tm.process({});
      }).to.throwException('responseType is required');
    });
    it('generates a state when a state is not provided', function() {
      expect(this.tm.process({ responseType: 'code' })).to.be.eql({
        responseType: 'code',
        state: 'randomState'
      });
    });
    it('generates a nonce when responseType contains id_token and a nonce is not provided', function() {
      TransactionManager.prototype.generateTransaction.restore();
      stub(TransactionManager.prototype, 'generateTransaction', function(
        appState,
        state,
        nonce,
        lastUsedConnection,
        generateNonce
      ) {
        expect(generateNonce).to.be(true);
        return {
          state: state || 'randomState',
          nonce: nonce || 'randomNonce',
          lastUsedConnection: lastUsedConnection
        };
      });
      expect(this.tm.process({ responseType: 'code id_token', state: 'some-state' })).to.be.eql({
        responseType: 'code id_token',
        state: 'some-state',
        nonce: 'randomNonce'
      });
    });
    it('returns same object when there is a state and a nonce', function() {
      expect(
        this.tm.process({ responseType: 'code id_token', state: 'some-state', nonce: 'some-nonce' })
      ).to.be.eql({
        responseType: 'code id_token',
        state: 'some-state',
        nonce: 'some-nonce'
      });
    });
  });
  context('generateTransaction', function() {
    beforeEach(function() {
      stub(random, 'randomString', function() {
        return 'randomString';
      });
      stub(storage, 'setItem');
    });
    afterEach(function() {
      random.randomString.restore();
      storage.setItem.restore();
    });
    it('always stores random state', function() {
      var result = this.tm.generateTransaction('appState', null, null, null, false);
      expect(result).to.be.eql({ state: 'randomString', nonce: null });
      expect(storage.setItem.calledOnce).to.be(true);
      expect(storage.setItem.lastCall.args[0]).to.be('com.auth0.auth.randomString');
      expect(storage.setItem.lastCall.args[1]).to.be.eql({
        nonce: null,
        appState: 'appState',
        state: 'randomString',
        lastUsedConnection: null
      });
    });
    it('only stores random nonce when generateNonce is true', function() {
      var result = this.tm.generateTransaction('appState', null, null, null, true);
      expect(result).to.be.eql({ state: 'randomString', nonce: 'randomString' });
      expect(storage.setItem.calledOnce).to.be(true);
      expect(storage.setItem.lastCall.args[0]).to.be('com.auth0.auth.randomString');
      expect(storage.setItem.lastCall.args[1]).to.be.eql({
        nonce: 'randomString',
        appState: 'appState',
        state: 'randomString',
        lastUsedConnection: null
      });
    });
    it('uses nonce/state when provided', function() {
      var result = this.tm.generateTransaction('appState', 'state', 'nonce', null);
      expect(result).to.be.eql({ state: 'state', nonce: 'nonce' });
      expect(storage.setItem.calledOnce).to.be(true);
      expect(storage.setItem.lastCall.args[0]).to.be('com.auth0.auth.state');
      expect(storage.setItem.lastCall.args[1]).to.be.eql({
        nonce: 'nonce',
        appState: 'appState',
        state: 'state',
        lastUsedConnection: null
      });
    });
    it('uses lastUsedConnection when provided', function() {
      var result = this.tm.generateTransaction('appState', 'state', 'nonce', 'lastUsedConnection');
      expect(result).to.be.eql({ state: 'state', nonce: 'nonce' });
      expect(storage.setItem.calledOnce).to.be(true);
      expect(storage.setItem.lastCall.args[0]).to.be('com.auth0.auth.state');
      expect(storage.setItem.lastCall.args[1]).to.be.eql({
        nonce: 'nonce',
        appState: 'appState',
        state: 'state',
        lastUsedConnection: 'lastUsedConnection'
      });
    });
  });
  context('getStoredTransaction', function() {
    beforeEach(function() {
      stub(storage, 'getItem', function(state) {
        expect(state).to.be('com.auth0.auth.state');
        return { from: 'storage' };
      });
      spy(TransactionManager.prototype, 'clearTransaction');
    });
    afterEach(function() {
      storage.getItem.restore();
      TransactionManager.prototype.clearTransaction.restore();
    });
    it('returns transaction data from storage', function() {
      var state = this.tm.getStoredTransaction('state');
      expect(state).to.be.eql({ from: 'storage' });
    });
    it('removes data from storage', function() {
      this.tm.getStoredTransaction('state');
      expect(TransactionManager.prototype.clearTransaction.firstCall.args[0]).to.be('state');
    });
  });
  context('clearTransaction', function() {
    beforeEach(function() {
      stub(storage, 'removeItem');
    });
    afterEach(function() {
      storage.removeItem.restore();
    });
    it('removes data from storage', function() {
      this.tm.clearTransaction('state');
      expect(storage.removeItem.calledOnce).to.be(true);
      expect(storage.removeItem.lastCall.args[0]).to.be('com.auth0.auth.state');
    });
  });
});
