const { createRxDatabase } = require('rxdb');

const fs = require('fs');
const filePath = './data.json';
const encryptionKey = 'd7049890ddc4d68c94e5e563e4caf66e6335380da58e4aa1a876a2b3955fb05d';
const iv = 'cf1eb419c660488c3c3e1727f9d87ac0';
const crypto = require("crypto")
const CONSTANTS = {
    'BUNDLES': "BUNDLES"
}

let myDatabase;


async function _exportDB() {
    console.log('before export')
    let jsonData = await myDatabase.umbrella_schema.exportJSON()
    console.log('after export')
    // jsonData = _encryptJson(jsonData, encryptionKey, iv)
    console.log('after encryption')
    // fs.writeFileSync(filePath, jsonData, 'utf8')
    fs.writeFileSync(filePath, JSON.stringify(jsonData), 'utf8')
    console.log('after write')

}

async function backupDB() {
    const backupOptions = {
        // if false, a one-time backup will be written
        live: false,
        // the folder where the backup will be stored
        directory: './my-backup-folder/',
    }
    const backupState = myDatabase.backup(backupOptions);
    await backupState.awaitInitialBackup();
}

async function _importDB() {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        if (fileContent) {
            const data = _decryptJson(fileContent, encryptionKey, iv)
            // fs.writeFileSync('a.json', JSON.stringify(data), 'utf8')
            await myDatabase.umbrella_schema.importJSON(data)
        }
    } catch (e) {
        console.log(e)
    }
}

async function _initDB() {
    myDatabase = await createRxDatabase({
        name: 'mydatabase',
        storage: getRxStorageMemory()
    });
}

async function _nativeSha256(input) {
    var data = new TextEncoder().encode(input);
    /**
     * If your JavaScript runtime does not support crypto.subtle.digest,
     * provide your own hash function when calling createRxDatabase().
     */

    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    /**
     * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
     */
    var hash = Array.prototype.map.call(new Uint8Array(hashBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    return hash;
}

function _encryptJson(data, key, iv) {
    const jsonString = JSON.stringify(data, null, 2);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function _decryptJson(encryptedData, key, iv) {
    // const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    // let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    // decrypted += decipher.final('utf8');
    return JSON.parse(encryptedData);
}

async function _addTodoSchema() {
    const todoSchema = {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: {
                type: 'string',
                maxLength: 100 // <- the primary key must have set maxLength
            },
            name: {
                type: 'string'
            },
            done: {
                type: 'boolean'
            },
            meta: {
                type: 'object'
            },
            timestamp: {
                type: 'string',
                format: 'date-time'
            }
        },
        encrypted: ['name', 'meta'],
        required: ['id', 'name', 'done', 'timestamp']
    }

    const collection = await myDatabase.addCollections({
        todos: {
            schema: todoSchema
        }
    });
}

async function _addUmbrellaSchema() {

    const schema = {
        "title": "umbrella_schema",
        "version": 0,
        "description": "Stores Umbrella Products / Bundles",
        "type": "array",
        primaryKey: 'umbrellaCode',
        "properties": {
            "umbrellaCode": {
                "type": "string",
                "maxLength": 100
            },
            "data": {
                "type": "object"
            },
            "metadata": {
                "type": "object"
            }
        },
        "required": ['umbrellaCode', "data"],
        "encrypted": ['data', 'metadata'],
    };

    const collection = await myDatabase.addCollections({
        umbrella_schema: {
            schema
        }
    });

    console.log(collection)
    console.log('-------------------------')
    console.log(myDatabase.umbrella_schema)
}

async function _addClassSchema() {

    const schema = {
        "title": "class_enrollements_schema",
        "version": 0,
        "description": "stores user class enrollements",
        primaryKey: 'uid',
        "type": "object",
        "properties": {
            "uid": {
                "type": "string",
                "maxLength": 100
            },
            "spaces": {
                "type": "object",
            },
            "metadata": {
                "type": "object",
            }
        },
        "encrypted": ["spaces", "metadata"],
        "required": ['uid', "spaces"]
    };

    const collection = await myDatabase.addCollections({
        class_enrollements_schema: {
            schema
        }
    });
}

async function _insertToDB({ id = '1', name = 'Todo 1', done = false, meta = { s1: '1', s2: '2' } }) {
    const myDocument = await myDatabase.todos.insert({
        id,
        name,
        done,
        meta,
        timestamp: new Date().toISOString()
    });
}

async function _bulkInsertToDB(data) {
    const myDocument = await myDatabase.todos.bulkInsert(data);
}

async function _getAllDocs(verbose = false) {
    const foundDocuments = await myDatabase.todos.find().exec();
    if (verbose) {
        foundDocuments.forEach(doc => console.log(doc._data))
    }
}

async function addUmbrellasToDB() {
    // read from file
    const fileContent = JSON.parse(fs.readFileSync('./dummy_data/umbrellaData.json', 'utf8'))
    // console.log(fileContent)
    // insert to db
    await myDatabase.umbrella_schema.bulkInsert(fileContent)
}

async function addClassesToDB() {
    // read from file
    const fileContent = JSON.parse(fs.readFileSync('./dummy_data/spacesData.json', 'utf8'))
    // console.log(fileContent)
    // insert to db

    await myDatabase.class_enrollements_schema.upsert(fileContent)

}

async function importCollectionData() {

}

// async function run() {
//     await _initDB()
//     await _addTodoSchema()
//     await _importDB()
//     await _getAllDocs()
//     // console.time('insertSingle')
//     // for (let i = 0; i < 500000; i++) {
//     //     console.log(i)
//     //     await _insertToDB({ id: "" + i, name: 'Todo' + i, done: false, meta: { s1: "SA" + i, s2: "SB" + i } })
//     // }
//     // console.timeEnd('insertSingle')

//     console.time('insertBulk')
//     const data = []
//     for (let i = 0; i < 50000; i++) {
//         if(i%10000 == 0) console.log(i)
//         data.push({ id: "" + i, name: 'Todo' + i, done: false, meta: { s1: "SA" + i, s2: "SB" + i } })
//     }
//     console.log('beforeInsert')
//     await _bulkInsertToDB(data)
//     console.timeEnd('insertBulk')

//     // await _getAllDocs()
//     console.time('export')
//     await _exportDB()
//     console.timeEnd('export')
// }

// run()


async function fetchClasses() {
    let data = await myDatabase.class_enrollements_schema.find().where('uid').eq('6adca7b76d0c436e96748c5008f3d361').exec()
    fs.writeFileSync('b.json', JSON.stringify(data), 'utf8')
}

async function fetchUmbrellas() {
    let data = await myDatabase.umbrella_schema.exportJSON()
    fs.writeFileSync('c.json', JSON.stringify(data), 'utf8')
}

async function runBundles1() {
    try {

        console.time('init')
        await _initDB()
        console.timeEnd('init')

        console.time('addUmbrellaSchema')
        await _addUmbrellaSchema()
        console.timeEnd('addUmbrellaSchema')

        console.time('addClassSchema')
        await _addClassSchema()
        console.timeEnd('addClassSchema')

        console.time('addUmbrellasToDB')
        await addUmbrellasToDB()
        console.timeEnd('addUmbrellasToDB')

        console.time('addClassesToDB')
        await addClassesToDB()
        console.timeEnd('addClassesToDB')

        // console.log(myDatabase)

        console.time('_exportDB')
        await _exportDB()
        console.timeEnd('_exportDB')


    } catch (e) {
        console.log(e)
    }

}


async function runBundles2() {
    try {

        console.time('init')
        await _initDB()
        console.timeEnd('init')

        console.time('addUmbrellaSchema')
        await _addUmbrellaSchema()
        console.timeEnd('addUmbrellaSchema')

        console.time('addClassSchema')
        await _addClassSchema()
        console.timeEnd('addClassSchema')

        console.time('_importDB')
        await _importDB()
        console.timeEnd('_importDB')

        console.time('fetchClasses')
        await fetchClasses()
        console.timeEnd('fetchClasses')

        console.time('fetchUmbrellas')
        await fetchUmbrellas()
        console.timeEnd('fetchUmbrellas')


    } catch (e) {
        console.log(e)
    }

}


// runBundles1()
runBundles2()

// _initDB().then(e => {
//     // console.log(myDatabase)
// })