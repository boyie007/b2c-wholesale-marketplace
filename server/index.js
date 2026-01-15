const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
const DATA_FILE = './data.json';

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE));
};

const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));

let products = loadProducts();

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; text-align:center; padding:50px;">
      <h1>📦 Inventory Manager</h1>
      <a href="/products">API Data</a> | <a href="/admin">Add Product</a> | <a href="/manage">Manage/Delete</a>
    </body>
  `);
});

// MANAGE PAGE (With Delete Buttons)
app.get('/manage', (req, res) => {
  let listItems = products.map(p => `
    <li style="margin-bottom:10px;">
      <strong>${p.name}</strong> - $${p.price} 
      <form action="/delete-product" method="POST" style="display:inline;">
        <input type="hidden" name="id" value="${p.id}">
        <button type="submit" style="color:red; cursor:pointer;">Delete</button>
      </form>
    </li>
  `).join('');

  res.send(`
    <body style="font-family:sans-serif; padding:50px;">
      <h2>Current Inventory</h2>
      <ul>${listItems}</ul>
      <a href="/">Back Home</a>
    </body>
  `);
});

// DELETE LOGIC
app.post('/delete-product', (req, res) => {
  const idToDelete = req.body.id;
  // Keep everything EXCEPT the item with the ID we want to delete
  products = products.filter(p => p.id.toString() !== idToDelete.toString());
  
  saveProducts(products);
  res.redirect('/manage'); // Refresh the page to show it's gone
});

// (Keep your existing /admin, /add-product, and /products routes here...)
app.get('/admin', (req, res) => {
  res.send(`
    <form action="/add-product" method="POST" style="padding:50px;">
      <input type="text" name="itemName" placeholder="Product Name" required>
      <input type="number" name="itemPrice" placeholder="Price" required>
      <button type="submit">Add Product</button>
    </form>
  `);
});

app.post('/add-product', (req, res) => {
  const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice };
  products.push(newItem);
  saveProducts(products);
  res.redirect('/manage');
});

app.get('/products', (req, res) => res.json(products));

app.listen(PORT, () => console.log(`🚀 Management System live at http://localhost:${PORT}`));