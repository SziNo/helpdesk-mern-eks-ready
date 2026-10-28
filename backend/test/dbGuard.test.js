// A rossz adatbázis elleni védelem tesztjei (adatbázis kapcsolat nélkül futnak)
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateTestMongoUri, assertTestMongoUri } = require("./dbGuard");

describe("MONGO_URI_TEST védelem", () => {
  it("elfogadja a helyi és a docker / CI teszt adatbázisokat", () => {
    for (const uri of [
      "mongodb://localhost:27018/helpdesk_test",
      "mongodb://127.0.0.1/helpdesk_test",
      "mongodb://mongo:27017/test",
      "mongodb://user:pw@localhost:27017/helpdesk_TEST?authSource=admin",
    ]) {
      assert.equal(validateTestMongoUri(uri).ok, true, uri);
    }
  });

  it("elutasítja a hiányzó címet", () => {
    assert.equal(validateTestMongoUri(undefined).ok, false);
    assert.equal(validateTestMongoUri("").ok, false);
  });

  it("elutasítja a mongodb+srv:// (Atlas) címet", () => {
    // Hozzáférési adat nélküli, kitalált Atlas-szerű cím: a védelem a mongodb+srv:// séma
    // miatt utasítja el, ehhez jelszó nem kell. (Felhasználó:jelszó párral a GitHub
    // titokkeresője valódi kiszivárgásnak jelezné.)
    const result = validateTestMongoUri(
      "mongodb+srv://cluster0.example.mongodb.net/helpdesk_test",
    );
    assert.equal(result.ok, false);
    assert.match(result.reason, /mongodb\+srv/);
  });

  it("elutasítja a nem engedélyezett hostot", () => {
    for (const uri of [
      "mongodb://db.example.com:27017/helpdesk_test",
      "mongodb://localhost:27017,prod-db:27017/helpdesk_test",
      "mongodb://mongodb:27017/helpdesk_test",
    ]) {
      assert.equal(validateTestMongoUri(uri).ok, false, uri);
    }
  });

  it('elutasítja, ha az adatbázis neve nem tartalmazza a "test" szót', () => {
    for (const uri of [
      "mongodb://localhost:27017/helpdesk",
      "mongodb://localhost:27017/",
      "mongodb://localhost:27017",
      "mongodb://localhost:27017/helpdesk?appName=test",
    ]) {
      assert.equal(validateTestMongoUri(uri).ok, false, uri);
    }
  });

  it("az assertTestMongoUri érthető hibaüzenettel dob", () => {
    assert.throws(
      () => assertTestMongoUri("mongodb://localhost:27017/helpdesk"),
      /A tesztek nem futnak: .*"test" szót/,
    );
  });
});
