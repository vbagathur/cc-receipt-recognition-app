const CosmosClient = require("@azure/cosmos").CosmosClient;
//  </ImportConfiguration>

let dotenv = require('dotenv').config();

const cosmos_db_endpoint=process.env.COSMOS_DB_ENDPOINT;
const cosmos_db_key=process.env.COSMOS_DB_KEY;
const databaseId='ToDoList'
const containerId='Items';
const options = {
    endpoint: cosmos_db_endpoint,
    key: cosmos_db_key,
}

async function insertRecord(userId, receiptId, receiptObj) {

  //  <DefineNewItem>
  const newItem = {
    id: userId + '-' + receiptId,
    category: "Receipts",
    name: "Cosmos DB for Receipts",
    description: "Vish CC Azure Project",
    isComplete: false,
    receiptId: receiptId,
    userId : userId,
    receiptObj: receiptObj
  };
  //  </DefineNewItem>
  
  // <CreateClientObjectDatabaseContainer>

  const client = new CosmosClient(options);

  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Make sure Tasks database is already setup. If not, create it.
  //await dbContext.create(client, databaseId, containerId);
  // </CreateClientObjectDatabaseContainer>
  
  try {
    
    // <CreateItem>
    /** Create new item
     * newItem is defined at the top of this file
     */
    const { resource: createdItem } = await container.items.create(newItem);
    
    console.log(`\r\nCreated new item: ${createdItem.id} - ${createdItem.description}\r\n`);
    // </CreateItem>
    
  } catch (err) {
    console.log(err.message);
  }
};

async function queryRecord(userId, receiptId) {
  
  // <CreateClientObjectDatabaseContainer>

  const client = new CosmosClient(options);

  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Make sure Tasks database is already setup. If not, create it.
  //await dbContext.create(client, databaseId, containerId);
  // </CreateClientObjectDatabaseContainer>
  
  try {
    // <QueryItems>
    console.log(`Querying container: Items`);

    // query to return all items
    const querySpec = {
      query: 'SELECT * from c where c.id = "' + userId + '-'+  receiptId + '"'
    };
    
    // read all items in the Items container
    const { resources: items } = await container.items
      .query(querySpec)
      .fetchAll();

    items.forEach(item => {
      console.log(`${item.id} - ${item.description}`);
    });

    return items;

    // </QueryItems>
    
  } catch (err) {
    console.log(err.message);
  }
};

module.exports.queryRecord = queryRecord;
module.exports.insertRecord = insertRecord;