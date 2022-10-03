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

//  <DefineNewItem>
const newItem = {
  id: "3",
  category: "fun",
  name: "Cosmos DB",
  description: "Complete Cosmos DB Node.js Quickstart ⚡",
  isComplete: false
};
//  </DefineNewItem>

async function crudInCosmos() {
  
  // <CreateClientObjectDatabaseContainer>

  console.log(cosmos_db_endpoint);
  console.log(cosmos_db_key);
  const client = new CosmosClient(options);

  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Make sure Tasks database is already setup. If not, create it.
  //await dbContext.create(client, databaseId, containerId);
  // </CreateClientObjectDatabaseContainer>
  
  try {
    // <QueryItems>
    console.log(`Querying container: Items`);
    const userId = 'vish';
    const receiptId = 'newid';

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
    // </QueryItems>
    
    // <CreateItem>
    /** Create new item
     * newItem is defined at the top of this file
     */
    const { resource: createdItem } = await container.items.create(newItem);
    
    console.log(`\r\nCreated new item: ${createdItem.id} - ${createdItem.description}\r\n`);
    // </CreateItem>
    
    // <UpdateItem>
    /** Update item
     * Pull the id and partition key value from the newly created item.
     * Update the isComplete field to true.
     */
    const { id, category } = createdItem;

    createdItem.isComplete = true;

    const { resource: updatedItem } = await container
      .item(id, category)
      .replace(createdItem);

    console.log(`Updated item: ${updatedItem.id} - ${updatedItem.description}`); 
    console.log(`Updated isComplete to ${updatedItem.isComplete}\r\n`);
    // </UpdateItem>
    
    // <DeleteItem>    
    /**
     * Delete item
     * Pass the id and partition key value to delete the item
     */
    const { resource: result } = await container.item(id, category).delete();
    console.log(`Deleted item with id: ${id}`);
    // </DeleteItem>  
    
  } catch (err) {
    console.log(err.message);
  }
}

crudInCosmos();