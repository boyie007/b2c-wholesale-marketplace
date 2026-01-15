const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

// MIDDLEWARE: Allows server to read form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = './data.json';

// --- DATABASE LOGIC (File System) ---

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) {
        // Default data if file doesn't exist yet
        const initialData = [
            { id: 1, name: "Wholesale Flour (50kg)", price: 45 },
            { id: 2, name: "Bulk Sugar (20kg)", price: 30 }
        ];
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
};

const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));

let products = loadProducts();

// --- ROUTES ---

// 1. HOME PAGE (User Interface with Search)
app.get('/', (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; text-align:center; padding:50px; background-color: #f4f4f4;">
      <div style="background:white; display:inline-block; padding:30px; border-radius:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1>📦 Wholesale Marketplace</h1>
        
        <form action="/products" method="GET" style="margin: 20px 0;">
          <input type="text" name="search" placeholder="Search (e.g. Flour)" style="padding:10px; width:200px; border:1px solid #ddd; border-radius:5px;">
          <button type="submit" style="padding:10px 20px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer;">Search</button>
        </form>

        <hr>
        <div style="margin-top:20px;">
          <a href="/products" style="margin:10px; text-decoration:none; color:#2980b9;">View Inventory</a> | 
          <a href="/admin" style="margin:10px; text-decoration:none; color:#2980b9;">Add Product</a> | 
          <a href="/manage" style="margin:10px; text-decoration:none; color:#c0392b;">Manage Items</a>
        </div>
      </div>
    </body>
  `);
});

// 2. PRODUCTS API (With Search/Filter Logic)
app.get('/products', (req, res) => {
  const searchTerm = req.query.search;
  if (searchTerm) {
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return res.json(filtered);
  }
  res.json(products);
});

// 3. ADMIN PAGE (Add Product Form)
app.get('/admin', (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; padding:50px;">
      <h2>Add New Wholesale Item</h2>
      <form action="/add-product" method="POST">
        <p><input type="text" name="itemName" placeholder="Product Name" required style="padding:10px; width:300px;"></p>
        <p><input type="number" name="itemPrice" placeholder="Price ($)" required style="padding:10px; width:300px;"></p>
        <button type="submit" style="padding:10px 20px; background:#2980b9; color:white; border:none; cursor:pointer;">Add to Marketplace</button>
      </form>
      <br><a href="/">Back Home</a>
    </body>
  `);
});

// 4. ADD PRODUCT LOGIC
app.post('/add-product', (req, res) => {
  const newItem = { 
    id: Date.now(), 
    name: req.body.itemName, 
    price: parseFloat(req.body.itemPrice) 
  };
  products.push(newItem);
  saveProducts(products);
  res.redirect('/manage');
});

// 5. MANAGE PAGE (List with Delete Buttons)
app.get('/manage', (req, res) => {
  let rows = products.map(p => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding:10px;">${p.name}</td>
      <td style="padding:10px;">$${p.price}</td>
      <td style="padding:10px;">
        <form action="/delete-product" method="POST" style="display:inline;">
          <input type="hidden" name="id" value="${p.id}">
          <button type="submit" style="color:red; background:none; border:1px solid red; padding:5px; cursor:pointer;">Delete</button>
        </form>
      </td>
    </tr>
  `).join('');

  res.send(`
    <body style="font-family:sans-serif; padding:50px;">
      <h1>Inventory Management</h1>
      <table style="width:100%; border-collapse: collapse; text-align:left;">
        <thead><tr style="background:#eee;"><th style="padding:10px;">Name</th><th style="padding:10px;">Price</th><th style="padding:10px;">Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <br><a href="/">Back Home</a>
    </body>
  `);
});

// 6. DELETE LOGIC
app.post('/delete-product', (req, res) => {
  products = products.filter(p => p.id.toString() !== req.body.id.toString());
  saveProducts(products);
  res.redirect('/manage');
});

app.listen(PORT, () => {
  console.log(`🚀 Marketplace Server live at http://localhost:${PORT}`);
});