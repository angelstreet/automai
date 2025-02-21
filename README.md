# Automai SaaS

Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

Start the development server with:
```bash
npm run dev
```
Access the application at [http://localhost:3000](h.

## Running Tests

To run end-to-end tests, execute:
```bash
npx jest tests/e2e.test.ts --runInBand
```
Alternatively, if configured in package.json, run:
```bash
npm test
```

## Running the Browser MCP Tool

Use the following command to run the browser MCP tool, which helps analyze browser logs and console errors:
```bash
npx @agentdeskai/browser-tools-server
```

## Additional Documentation

For detailed project documentation, architecture, and advanced configuration, please refer to the docs in the `docs` directory.

---

Happy Testing!