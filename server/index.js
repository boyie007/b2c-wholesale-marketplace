const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = './data.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "secret123"; // Default for local testing

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE));
};
const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));
let products = loadProducts();

// --- SECURITY MIDDLEWARE ---
// This function checks if the "pwd" in the URL matches our secret
const isAdmin = (req, res, next) => {
    if (req.query.pwd === ADMIN_PASSWORD || req.body.pwd === ADMIN_PASSWORD) {
        return next();
    }
    res.status(403).send("<h1>403 Forbidden</h1><p>You do not have permission to access this page.</p>");
};

// --- ROUTES ---

// 1. HOME (Public)
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="text-center bg-white p-12 rounded-2xl shadow-xl">
          <h1 class="text-4xl font-black text-indigo-600 mb-4">WholesaleConnect</h1>
          <p class="text-gray-500 mb-8">Premium B2C Wholesale Marketplace</p>
          <a href="/products" class="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition">Enter Marketplace</a>
        </div>
      </body>
    </html>
  `);
});

// 2. PRODUCTS (Public View)
app.get('/products', (req, res) => {
  const searchTerm = req.query.search || "";
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const cards = filtered.map(p => `
    <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
      <img class="h-48 w-full object-cover" src="${p.image}">
      <div class="p-6">
        <h3 class="text-lg font-bold">${p.name}</h3>
        <p class="text-indigo-600 font-bold">$${p.price}</p>
        <button class="mt-4 w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50">Inquire Now</button>
      </div>
    </div>
  `).join('');

  res.send(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-6xl mx-auto">
          <div class="flex justify-between items-center mb-10">
            <h2 class="text-3xl font-bold">Catalog</h2>
            <form action="/products" method="GET" class="flex gap-2">
                <input type="text" name="search" placeholder="Search..." class="border p-2 rounded-lg">
                <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Search</button>
            </form>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cards}</div>
        </div>
      </body>
    </html>
  `);
});

// 3. ADMIN (Protected)
// Access this via: http://localhost:3000/admin?pwd=secret123
app.get('/admin', isAdmin, (req, res) => {
  res.send(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-10">
        <h2 class="text-2xl font-bold mb-4">Add New Product</h2>
        <form action="/add-product" method="POST" class="space-y-4 max-w-md">
          <input type="hidden" name="pwd" value="${req.query.pwd}">
          <input type="text" name="itemName" placeholder="Name" class="w-full border p-2 rounded" required>
          <input type="number" name="itemPrice" placeholder="Price" class="w-full border p-2 rounded" required>
          <input type="text" name="itemImage" placeholder="Image URL" class="w-full border p-2 rounded">
          <button class="bg-green-600 text-white px-4 py-2 rounded">Publish</button>
        </form>
      </body>
    </html>
  `);
});

// 4. LOGIC (Protected)
app.post('/add-product', isAdmin, (req, res) => {
  const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice, image: req.body.itemImage || 'https://via.placeholder.com/150' };
  products.push(newItem);
  saveProducts(products);
  res.redirect(`/products`); // Or redirect back to admin with the pwd
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));