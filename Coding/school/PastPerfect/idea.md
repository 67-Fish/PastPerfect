Build a website like savemyexams. The backend should use node.js and frontend should just use ejs.

 The concept is this: That savemyexams gives past papers for cambridge and major exams. This new idea (PastPerfect) will give past papers for specific schools to its students. Basically an archive.

Database will be taken care of by me. 

Backend Architecture, taken from my other project:

- Use a modular monolith with Node.js (ES Modules), Express 5, and MySQL 8.
- Organize the backend by domain/module rather than one large set of routes.
- Use a layered structure where appropriate: routes/controllers → services/managers → repositories → database.
- Use REST for normal application operations and WebSockets for real-time features
- Use JWT + HttpOnly cookies for authentication.
- Use background jobs for scheduled sync, retries, webhooks, and maintenance.
- Prefer clear separation of concerns and extensibility without prematurely splitting into microservices.

What's important right now is making the pdf upload work. The idea is that  schools will upload. Make the roles: admin, schoolAdmin (the admin from the school), teacher, student. There will also be payment so just add a placeholder. No need to add the payment methods just yet. Also make a system that will easily implement multiple schools being a part of the site. Not only one school. Right now we're just testing with one school but might expand so just implement the system first. The studying feature like savemyexams should currently just be placeholders first.

For the design, follow SaveMyExams. For the colors, follow this:\
Colour	Hex	Use\
Deep Navy	#172A46	Main branding, headings, logo\
Sky Blue	#6FA8DC	Buttons, highlights, icons\
Soft Cream	#F7F4EC	Background\
White	#FFFFFF	Cards/sections\
Dark Grey	#343A40	Body text

For the font:\
Title: Poppins Bold\
Subtitle: Poppins Medium\
Body: Inter Regular\
Important words: Poppins SemiBold

Report back to me with your plan to implement this. Divide the plan into phases and chunks to ensure you don't burn out. Don't burn out, and make sure that you can finish it. 
