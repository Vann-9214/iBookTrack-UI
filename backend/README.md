# iBookTrack Backend Architecture

This backend follows a modular, layered architecture. The goal of this structure is to ensure scalability, make maintenance incredibly easy for human developers, and provide a highly predictable layout for AI coding assistants. By separating our routing from our database queries and business logic, we prevent massive, monolithic files from causing confusion.

---

## Directory Structure

### 📁 `config/`

Configuration files and initializations for external services, environment variables, and databases.
For example, this is where you will find the Supabase client initialization. Keeping these separate ensures that if you ever swap out a database or service provider, you only have to update the configuration in one predictable place.

### 📁 `controllers/`

The "Cashier" or traffic cop of the application.
Controllers extract data from incoming HTTP requests (`req.body`, `req.params`) and pass that data down to the services or repositories to do the actual work. Once the work is done, the controller is solely responsible for formulating and sending the final HTTP response (e.g., `res.status(200).json(...)`).

### 📁 `events/`

Handles the internal Event-Driven Architecture of the application.
Listeners inside this folder react to application events (e.g., `BOX_COMPLETED`) to perform non-blocking background tasks. This is perfectly suited for triggering audit logs, broadcasting WebSocket updates, or sending notification emails without slowing down the user's primary request.

### 📁 `jobs/`

Contains background tasks, scheduled scripts, and cron jobs.
This is primarily used for low-frequency safety polling or nightly reconciliation tasks. For instance, if an external API (like iLMS or Scan Manager) does not support webhooks, a script here can safely run every hour to guarantee our database remains perfectly synced without overloading external servers.

### 📁 `legacy/`

Old or deprecated code that is being phased out.
This code is kept around either for historical reference or because older systems temporarily rely on it until they are fully migrated. Once all references to this folder are updated in the active application, its contents can be safely deleted.

### 📁 `middleware/`

Express middlewares that intercept incoming HTTP requests before they ever reach a controller.
This is the perfect place to put logic for user authentication (token checking), rate-limiting to prevent spam, and centralized error handlers. Centralizing this logic keeps your routes incredibly clean and ensures security policies are applied universally.

### 📁 `migrations/`

Database migration scripts and historical schema definitions.
This folder serves as a timeline of how your database structure has evolved. It makes it incredibly easy for new developers to spin up a fresh local database that perfectly matches your production schema.

### 📁 `repositories/`

The "Stockroom" or Data Access Layer of the application.
This folder isolates absolutely all Supabase and raw SQL database interaction logic (like `.select()`, `.insert()`). By containing all queries here, you guarantee that if your database schema ever changes, you only ever have to update these files rather than hunting down queries scattered throughout your business logic.

### 📁 `routes/`

Defines the API endpoints (URLs) and maps them to their respective controller functions.
These files act as a simple directory or map for your API and should remain extremely thin with absolutely zero business logic inside them. If a developer needs to know what URLs exist, they look here first.

### 📁 `services/`

The "Chefs" of the application where the core business logic lives.
This is where heavy math, complex data orchestration, and integrations with external APIs (like iLMS or Scan Manager) take place. Services are called by controllers, execute the core rules of your business, and return clean data back up the chain.

### 📁 `types/`

Centralized JSDoc type definitions (e.g., `/** @typedef {Object} Box */`).
Importing these definitions across the application ensures perfectly predictable data shapes. This is incredibly important as it prevents human typos and allows AI coding assistants to write perfectly accurate code without needing to guess what a database record looks like.

### 📁 `utils/`

Generic, highly reusable helper functions.
This includes custom loggers, date formatters, and string manipulators. Because these functions are purely utility and don't rely on specific business rules, they can be safely imported and used anywhere in the application.

### 📁 `validators/`

The "Bouncer" of the application.
Validation schemas (using libraries like Zod or Yup) are placed here to ensure incoming JSON requests perfectly match the expected format. By rejecting malformed data before it even hits the controllers, you protect your application from crashes and eliminate repetitive `if (!req.body.id)` boilerplate checks.

---
