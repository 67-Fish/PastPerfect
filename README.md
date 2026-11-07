# PastPerfect

Welcome, Mr. Manny!

This application is a digital archive of past examination papers. It allows you to browse and access previous examination questions, organize learning materials, and create practice questions for students.

This guide will walk you through setting up and running the application on your computer. No programming experience is required. If you would like to just see a preview, you may watch the video here: https://drive.google.com/drive/folders/1oj-d66sOajx1dovfgq5Q0ZvgqA7-pYgl?usp=sharing

On the video, it is stated that there are 3 roles: Admin, School Admin, and Student. Teachers will upload past papers through the school admin account.

---

## 1. What You Need

Before getting started, please make sure you have:

- A computer (Windows, macOS, or Linux).
- An internet connection.
- [Node.js](https://nodejs.org/) installed on your computer.

**Installing Node.js**

1. Visit https://nodejs.org/
2. Download the LTS (Long-Term Support) version.
3. Open the downloaded installer.
4. Follow the installation instructions.
5. Once installed, you're ready to proceed.

## 2. Download the Application

1. Open the project's GitHub repository.
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the downloaded ZIP file to a location you can easily find (such as your Desktop).

You should now have a folder containing the application.

## 3. Open the Terminal

Next, we need to open a terminal inside the application folder.

**On Windows:**
1. Open the extracted application folder.
2. Click the address bar at the top of File Explorer.
3. Type `cmd` and press Enter.

**On macOS:**
1. Open Terminal.
2. Type `cd ` (including the space).
3. Drag the application folder into the Terminal window.
4. Press Enter.

You are now ready to install the application.

## 4. Set Up Your AI API Key

The application uses OpenRouter to power its AI features, such as generating practice questions.

To enable these features, you will need your own OpenRouter API key.

**Step 1: Create an OpenRouter Account**

1. Visit https://openrouter.ai/
2. Select **Sign Up** and create an account.
3. Follow the instructions to complete registration.

**Step 2: Generate an API Key**

1. Visit https://openrouter.ai/keys
2. Select **Create API Key**.
3. Give your key a name (e.g. Past Paper Archive).
4. Create and copy your API key.

**Step 3: Configure the Application**

1. Open the main application folder.
2. Find the `.env.example` file, if provided, and create a copy named `.env`. Otherwise, create a new file named `.env`.
3. Open the `.env` file using Notepad.
4. Add your API key:

```env
OPENROUTER_API_KEY=your_api_key_here
```

5. Replace `your_api_key_here` with the API key you copied earlier.
6. Save the file.

Your AI features should now be ready to use!

**Important:** Keep your API key private. Do not share it with anyone or upload your `.env` file to GitHub.

As long as no code is changed, no credits will be used. The AI system was created for the purpose of testing, and is therefore not using any paid models.

## 5. Install the Application

In the terminal, enter the following command:

```bash
npm install
```

Press Enter and wait for the installation to finish.

This command automatically downloads and installs the components required for the application to work.

You only need to do this once, unless the application is updated with new dependencies.

## 6. Run the Application

Once the installation is complete, enter:

```bash
npm start
```

Press Enter.

The application should now start running on your computer.

## 7. Open the Application

Open your preferred web browser (Google Chrome, Microsoft Edge, Firefox, etc.).

Enter the following address:

**http://localhost:3000**

You should now see the PastPerfect!

*Note: Keep the terminal window open while using the application. Closing it will stop the application.*

---

## Troubleshooting

**"npm is not recognized"**

Node.js may not have been installed correctly. Try reinstalling Node.js and restarting your terminal.

**"Port already in use"**

Another application may already be using the port required by this application. Try closing other running instances of the application.

**The application does not open**

Make sure the terminal is still running the application and check whether any error messages appear.

---

## Hosting & Availability

If you would like me to start the application for you, please let us know! We can arrange a suitable time when I will be available to temporarily host the website.

Unfortunately, I am unable to keep the application running permanently. Doing so would require a hosting service, which comes with additional costs. Alternatively, temporary hosting would require my personal laptop to remain switched on and connected to the internet, making permanent hosting impractical.

## Thank you!
Thank you for taking the time to try out this application. I hope you find it useful!
