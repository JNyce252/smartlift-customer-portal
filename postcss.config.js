export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

4. Commit new file

---

### **3. Create: .gitignore**

1. Click "Add file" → "Create new file"
2. Name: `.gitignore`
3. Paste:
```
# Dependencies
node_modules/
/.pnp
.pnp.js

# Production
/build
/dist

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Vite
.vite
