const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = './data.json';

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE));
};

const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));

let products = loadProducts();

// 1. HOME PAGE
app.get('/', (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; text-align:center; padding:50px; background:#f4f4f4;">
      <h1>📦 Wholesale Marketplace</h1>
      <form action="/products" method="GET">
        <input type="text" name="search" placeholder="Search products..." style="padding:10px; width:200px;">
        <button type="submit" style="padding:10px;">Search</button>
      </form>
      <br>
      <a href="/products">API View</a> | <a href="/admin">Add Product</a> | <a href="/manage">Manage</a>
    </body>
  `);
});

// 2. ADMIN PAGE (Updated with Image Input)
app.get('/admin', (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; padding:50px;">
      <h2>Add New Product</h2>
      <form action="/add-product" method="POST">
        <p><input type="text" name="itemName" placeholder="Product Name" required style="width:300px; padding:10px;"></p>
        <p><input type="number" name="itemPrice" placeholder="Price ($)" required style="width:300px; padding:10px;"></p>
        <p><input type="text" name="itemImage" placeholder="Image URL (e.g. https://images.unsplash.com/photo...)" style="width:300px; padding:10px;"></p>
        <button type="submit" style="padding:10px 20px; background:#2980b9; color:white; border:none; cursor:pointer;">List Product</button>
      </form>
    </body>
  `);
});

// 3. ADD PRODUCT LOGIC
app.post('/add-product', (req, res) => {
  const newItem = { 
    id: Date.now(), 
    name: req.body.itemName, 
    price: req.body.itemPrice,
    image: req.body.itemImage || 'https://via.placeholder.com/150' // Default if empty
  };
  products.push(newItem);
  saveProducts(products);
  res.redirect('/manage');
});

// 4. MANAGE PAGE (With Thumbnails)
app.get('/manage', (req, res) => {
  let rows = products.map(p => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding:10px;"><img src="${p.image}" width="50" height="50" style="object-fit:cover; border-radius:5px;"></td>
      <td style="padding:10px;">${p.name}</td>
      <td style="padding:10px;">$${p.price}</td>
      <td style="padding:10px;">
        <form action="/delete-product" method="POST" style="display:inline;">
          <input type="hidden" name="id" value="${p.id}">
          <button type="submit" style="color:red; border:1px solid red; background:none; cursor:pointer;">Delete</button>
        </form>
      </td>
    </tr>
  `).join('');

  res.send(`
    <body style="font-family:sans-serif; padding:50px;">
      <h1>Manage Inventory</h1>
      <table style="width:100%; border-collapse:collapse;">
        <thead style="background:#eee;"><tr><th>Image</th><th>Name</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <br><a href="/">Back Home</a>
    </body>
  `);
});

app.get('/products', (req, res) => {
  const searchTerm = req.query.search || "";
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productCards = filtered.map(p => `
    <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <img class="h-48 w-full object-cover" src="${p.image}" alt="${p.name}">
      <div class="p-6">
        <div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">Wholesale</div>
        <h3 class="block mt-1 text-lg leading-tight font-medium text-black">${p.name}</h3>
        <p class="mt-2 text-slate-500 font-bold text-xl">$${p.price}</p>
        <button class="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700">
          Contact Seller
        </button>
      </div>
    </div>
  `).join('');

  res.send(`
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Marketplace | Browse</title>
      </head>
      <body class="bg-gray-100 min-h-screen">
        <nav class="bg-white shadow-sm p-4 mb-8">
          <div class="max-w-6xl mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold text-indigo-600">WholesaleConnect</h1>
            <a href="/" class="text-gray-600 hover:text-indigo-600">Back Home</a>
          </div>
        </nav>

        <div class="max-w-6xl mx-auto px-4">
          <div class="mb-8 flex justify-between items-center">
            <h2 class="text-3xl font-extrabold text-gray-900">Current Inventory</h2>
            <form action="/products" method="GET" class="flex gap-2">
              <input type="text" name="search" value="${searchTerm}" placeholder="Search products..." class="border p-2 rounded-lg">
              <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Search</button>
            </form>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${productCards.length > 0 ? productCards : '<p class="text-gray-500">No products found.</p>'}
          </div>
        </div>
      </body>
    </html>
  `);
});
});

// Replace your app.listen line with this:
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
  console.log(`🚀 Marketplace Server live on port ${PORT}`);
});