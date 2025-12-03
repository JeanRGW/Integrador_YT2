# API Documentation

This directory contains complete API documentation for the Integrador_YT2 video sharing platform.

## Documentation Formats

### 1. OpenAPI Specification (RECOMMENDED) ⭐

**File:** `openapi.yaml`

The **OpenAPI 3.0** specification is the industry-standard format for REST APIs. It provides:

- Machine-readable API definition
- Interactive documentation with Swagger UI
- Automatic client SDK generation
- API testing tools integration
- Contract-first development support

#### How to Use

**Option A: Swagger UI (Interactive Documentation)**

1. Install Swagger UI:

   ```bash
   npm install -g swagger-ui-watcher
   ```

2. View interactive docs:

   ```bash
   swagger-ui-watcher docs/openapi.yaml
   ```

3. Open browser to `http://localhost:8000`

**Option B: Swagger Editor Online**

1. Go to https://editor.swagger.io/
2. File → Import File → Select `openapi.yaml`
3. View and test API in browser

**Option C: VS Code Extension**

1. Install "OpenAPI (Swagger) Editor" extension
2. Open `openapi.yaml`
3. Right-click → "Preview Swagger"

**Option D: Generate Documentation Site**

```bash
# Install Redoc CLI
npm install -g redoc-cli

# Generate static HTML
redoc-cli bundle docs/openapi.yaml -o docs/api-docs.html

# Open api-docs.html in browser
```

#### Benefits

✅ **Interactive Testing** - Try API calls directly from documentation  
✅ **Client Generation** - Auto-generate SDKs in multiple languages  
✅ **Type Safety** - Export TypeScript types from spec  
✅ **API Validation** - Validate requests/responses against spec  
✅ **Industry Standard** - Compatible with all major API tools

### 2. Human-Readable Documentation

**File:** `API_DOCUMENTATION.md`

Traditional Markdown documentation with detailed explanations and examples. Best for:

- Quick reference while coding
- Understanding API concepts and workflows
- Reading on GitHub
- Offline access without tools

## Quick Start

### For Developers

Use `openapi.yaml` with Swagger UI for interactive exploration and testing.

### For Documentation Readers

Open `API_DOCUMENTATION.md` for detailed guides and examples.

### For Integration Teams

Import `openapi.yaml` into your API client (Postman, Insomnia, etc.)

## Keeping Documentation Updated

When adding/modifying endpoints:

1. Update controller and routes
2. Update `openapi.yaml` with new endpoint definition
3. Update examples in `API_DOCUMENTATION.md` if needed
4. Test with Swagger UI to ensure spec is valid

## Tools & Resources

### Recommended Tools

- **Swagger UI**: Interactive API documentation
- **Postman**: Import OpenAPI spec for testing
- **Insomnia**: Alternative API client
- **openapi-typescript**: Generate TypeScript types
- **Redoc**: Beautiful static documentation

### Validation

Validate OpenAPI spec:

```bash
npm install -g @apidevtools/swagger-cli
swagger-cli validate docs/openapi.yaml
```

### Generate TypeScript Types

```bash
npm install -D openapi-typescript
npx openapi-typescript docs/openapi.yaml --output src/types/api.d.ts
```

## Additional Documentation

- `VIDEO_SEARCH_API.md` - Detailed video search functionality
- `.github/copilot-instructions.md` - Codebase guide for AI assistants

## Support

For API questions or issues:

1. Check the OpenAPI spec for endpoint details
2. Review examples in API_DOCUMENTATION.md
3. Test with Swagger UI to verify behavior
4. Check error responses in documentation

---

**Last Updated:** December 3, 2025  
**API Version:** 1.0.0  
**Specification:** OpenAPI 3.0.3
