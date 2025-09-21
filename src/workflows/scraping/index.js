// // src/workflows/scraping/index.js
// import { chromium } from 'playwright';
// import { load } from 'cheerio';
// import { selectors } from './utils/selectors.js';
// import { transformAndSanitizeHtml } from './utils/sanitizer.js';
// import { Command } from 'commander';
// import { promises as fs } from 'fs';
// import path from 'path';

// const randomWait = async (min = 8000, max = 10000) =>
//   new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// const sanitizeFilename = (name) => name.replace(/:/g, '-');

// const getTagForQuestion = (sectionName, questionNumber) => {
//   if (!sectionName || typeof questionNumber !== 'number') return null;
//   const s = sectionName.trim();
//   if (s === "Section I") {
//     if (questionNumber >= 1 && questionNumber <= 30) return 'MATH';
//     if (questionNumber >= 31 && questionNumber <= 60) return 'GI';
//   }
//   if (s === "Section II") {
//     if (questionNumber >= 1 && questionNumber <= 45) return 'ENG';
//     if (questionNumber >= 46 && questionNumber <= 70) return 'GK';
//   }
//   const lc = s.toLowerCase();
//   if (lc.includes("quantitative") || lc.includes("quants")) return 'MATH';
//   if (lc.includes("intelligence") || lc.includes("reasoning")) return 'GI';
//   if (lc.includes("english")) return 'ENG';
//   if (lc.includes("awareness") || lc.includes("knowledge")) return 'GK';
//   if (lc.includes("computer")) return 'COMPUTER';
//   if (lc.includes("bengali")) return 'BENGALI';
//   return null;
// };

// async function loadPage(url, cdpUrl) {
//   const browser = await chromium.connectOverCDP(cdpUrl);
//   const context = browser.contexts()[0] || await browser.newContext();
//   const page = await context.newPage();
//   await page.bringToFront();
//   await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
//   await randomWait();
//   return { page, browser };
// }

// async function clickButton(page, selector, buttonName) {
//   const el = await page.$(selector);
//   if (!el) {
//     console.error(`[-] ${buttonName} not found. Exiting.`);
//     process.exit(1);
//   }
//   await el.click();
//   console.log(`[*] ${buttonName} clicked.`);
//   await page.waitForTimeout(1000);
// }

// async function clickNext(page) {
//   try {
//     // Click the "Next" button
//     const nextButton = await page.waitForSelector('button[ng-click="navBtnPressed(true)"]', { timeout: 5000 });
//     await nextButton.click();
    
//     // Give the application a moment to respond
//     await page.waitForTimeout(1500);

//     // Check if the confirmation dialog for the last question has appeared.
//     // This is a reliable way to detect the end of the quiz.
//     const endOfQuizSelector = '//*[contains(text(), "You have reached the last question")]';
    
//     // Use a short timeout to quickly check for the element without a long wait.
//     // If it's not found, it will return null instead of throwing an error.
//     const endOfQuizElement = await page.waitForSelector(endOfQuizSelector, { state: 'visible', timeout: 2000 }).catch(() => null);

//     if (endOfQuizElement) {
//       console.log('[i] Detected the last question confirmation dialog. End of quiz reached.');
//       return false; // Signal that we have reached the end.
//     }

//     // If the dialog is not found, wait for the next question's container to load.
//     await page.waitForSelector(selectors.parser.activeQuestionContainer, { timeout: 5000 });
//     await page.waitForTimeout(1000 + Math.random() * 1000);
//     return true; // Successfully navigated to the next question.

//   } catch (error) {
//     // This catch block will handle cases where the "Next" button isn't found
//     // or if waiting for the next question container fails.
//     console.log('[i] Could not proceed to the next question. Assuming end of quiz.');
//     return false;
//   }
// }

// async function clickViewSolution(page) {
//   const viewButton = await page.$('button[ng-click="toggleViewSolution()"]');
//   if (!viewButton) {
//     console.error('[-] View Solution button not found. Exiting.');
//     process.exit(1);
//   }
//   await viewButton.click();
//   await page.waitForTimeout(1000 + Math.random() * 2000);
// }

// async function humanizedScroll(page, selector) {
//   const el = await page.$(selector);
//   if (el) {
//     await el.scrollIntoViewIfNeeded();
//     await page.evaluate(element => {
//       element.scrollBy(0, Math.floor(Math.random() * 50 + 50));
//     }, el);
//     await page.waitForTimeout(500 + Math.random() * 500);
//   }
// }

// async function humanizedMouseMovement(page) {
//   const { width, height } = await page.evaluate(() => ({
//     width: document.documentElement.clientWidth,
//     height: document.documentElement.clientHeight,
//   }));

//   const startX = Math.random() * width;
//   const startY = Math.random() * height;
//   await page.mouse.move(startX, startY);

//   const randomSteps = Math.floor(Math.random() * 5) + 3;
//   for (let i = 0; i < randomSteps; i++) {
//     const endX = Math.random() * width;
//     const endY = Math.random() * height;
//     await page.mouse.move(endX, endY, { steps: Math.floor(Math.random() * 10) + 5 });
//   }
//   await page.waitForTimeout(500 + Math.random() * 500);
// }

// async function scrapeAndSanitizeQuestion(page, serialNumber, userTag) {
//   const html = await page.content();
//   const $ = load(html);
//   const container = $(selectors.parser.activeQuestionContainer);

//   const sectionName = $(selectors.parser.sectionName).text().trim();
//   const questionNumberText = container.find(selectors.parser.questionNumber).text().trim();
//   const realQuestionNumber = parseInt(questionNumberText.match(/\d+$/)?.[0], 10) || 0;

//   const derivedTag = getTagForQuestion(sectionName, realQuestionNumber);
//   const tags = [];
//   if (derivedTag) tags.push(derivedTag);
//   if (userTag) tags.push(userTag);

//   const questionHtml = container.find(selectors.parser.questionBody).html() || '';
//   const optionsHtml = [];
//   container.find(selectors.parser.optionContainer).each((i, el) => {
//     const htmlContent = $(el).find(selectors.parser.optionText).html();
//     if (htmlContent) optionsHtml.push(htmlContent);
//   });
//   const answerHtml = container
//     .find(selectors.parser.optionContainer)
//     .filter((i, el) => $(el).hasClass(selectors.parser.correctOptionClass))
//     .find(selectors.parser.optionText)
//     .html() || '';
//   const solutionHtml = container.find(selectors.parser.solution).html() || '';

//   const sanitizedQuestion = await transformAndSanitizeHtml(questionHtml);
//   const sanitizedOptions = await Promise.all(
//     optionsHtml.slice(0, 4).map(opt => transformAndSanitizeHtml(opt))
//   );
//   const sanitizedAnswerText = await transformAndSanitizeHtml(answerHtml);
//   const sanitizedSolution = await transformAndSanitizeHtml(solutionHtml);

//   const answerIndex = sanitizedOptions.findIndex(opt => opt === sanitizedAnswerText);
//   const finalAnswer = answerIndex !== -1 ? (answerIndex + 1).toString() : '';

//   return {
//     SL: serialNumber,
//     Question: sanitizedQuestion,
//     OP1: sanitizedOptions[0] || '',
//     OP2: sanitizedOptions[1] || '',
//     OP3: sanitizedOptions[2] || '',
//     OP4: sanitizedOptions[3] || '',
//     Answer: finalAnswer,
//     Solution: sanitizedSolution,
//     Tags: tags
//   };
// }

// function parseArguments() {
//   const program = new Command();
//   program
//     .option('--link <url>', 'URL of the quiz/analysis page')
//     .option('--count <number>', 'Number of questions to scrape', parseInt)
//     .option('--tag <string>', 'A custom tag to add to every question')
//     .option('--skip <number>', 'Number of questions to skip before starting', parseInt)
//     .parse(process.argv);

//   const options = program.opts();
//   if (!options.link) {
//     console.error('[-] Please provide a URL using --link');
//     process.exit(1);
//   }
//   options.skip = options.skip || 0;
//   return options;
// }

// async function scrapeQuestions(page, count, userTag, skip = 0) {
//   const scrapedQuestions = [];
//   let questionsScraped = 0;

//   // Skip questions if skip flag is provided
//   for (let i = 0; i < skip; i++) {
//     const hasNext = await clickNext(page);
//     if (!hasNext) {
//       console.log('[i] Reached the last question while skipping. Ending.');
//       return scrapedQuestions;
//     }
//     console.log(`[i] Skipped question ${i + 1}`);
//   }

//   while (true) {
//     await clickViewSolution(page);
//     await humanizedScroll(page, selectors.parser.activeQuestionContainer);
//     await humanizedMouseMovement(page);

//     const data = await scrapeAndSanitizeQuestion(page, questionsScraped + 1 + skip, userTag);
//     scrapedQuestions.push(data);
//     questionsScraped++;
//     console.log(`[*] Scraping Question ${questionsScraped + skip}...`);

//     if (count && questionsScraped >= count) break;

//     const hasNext = await clickNext(page);
//     if (!hasNext) {
//       console.log('[i] Reached the last question. Ending scraping.');
//       break;
//     }
//   }
//   return scrapedQuestions;
// }

// async function saveScrapedData(examName, scrapedQuestions) {
//   const sanitizedExamName = sanitizeFilename(examName);
//   const outputDir = path.resolve('output', 'scraped');
//   const outputPath = path.join(outputDir, `${sanitizedExamName}.json`);

//   await fs.mkdir(outputDir, { recursive: true });
//   await fs.writeFile(outputPath, JSON.stringify(scrapedQuestions, null, 2), 'utf-8');

//   console.log(`[+] Saved scraped data to ${outputPath}`);
// }

// async function main() {
//   const CDP_URL = 'http://localhost:9223';
//   let page;
//   let browser;

//   try {
//     const options = parseArguments();
//     if (options.tag) console.log(`[i] Applying custom tag to all questions: "${options.tag}"`);

//     const { page: newPage, browser: newBrowser } = await loadPage(options.link, CDP_URL);
//     page = newPage;
//     browser = newBrowser;

//     const $ = load(await page.content());
//     const examName = $(selectors.parser.examName).text().trim();
//     if (!examName) throw new Error('Exam Name not found');
//     console.log(`[i] Found Exam Name: ${examName}`);

//     await humanizedMouseMovement(page);
//     await clickButton(page, selectors.scraper.solutionsButton, 'Solutions');
//     await page.waitForTimeout(1000 + Math.random() * 2000);
//     await page.waitForSelector(selectors.parser.activeQuestionContainer, { timeout: 5000 });

//     const scrapedQuestions = await scrapeQuestions(page, options.count, options.tag, options.skip);
//     console.log(`[+] Scraped a total of ${scrapedQuestions.length} questions successfully.`);

//     await saveScrapedData(examName, scrapedQuestions);

//   } catch (err) {
//     console.error(`[-] An error occurred: ${err.message}`);
//     process.exit(1);
//   } finally {
//     if (page && !page.isClosed()) await page.close();
//     if (browser && browser.isConnected()) {
//       await browser.close();
//       console.log('[i] Disconnected from the browser.');
//     }
//   }
// }

// main();


// src/workflows/scraping/index.js
import { chromium } from 'playwright';
import { load } from 'cheerio';
import { selectors } from './utils/selectors.js';
import { transformAndSanitizeHtml } from './utils/sanitizer.js';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';

const randomWait = async (min = 8000, max = 10000) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

const sanitizeFilename = (name) => name.replace(/:/g, '-');

const getTagForQuestion = (sectionName, questionNumber) => {
  if (!sectionName || typeof questionNumber !== 'number') return null;
  const s = sectionName.trim();
  if (s === "Section I") {
    if (questionNumber >= 1 && questionNumber <= 30) return 'MATH';
    if (questionNumber >= 31 && questionNumber <= 60) return 'GI';
  }
  if (s === "Section II") {
    if (questionNumber >= 1 && questionNumber <= 45) return 'ENG';
    if (questionNumber >= 46 && questionNumber <= 70) return 'GK';
  }
  const lc = s.toLowerCase();
  if (lc.includes("quantitative") || lc.includes("quants")) return 'MATH';
  if (lc.includes("intelligence") || lc.includes("reasoning")) return 'GI';
  if (lc.includes("english")) return 'ENG';
  if (lc.includes("awareness") || lc.includes("knowledge")) return 'GK';
  if (lc.includes("computer")) return 'COMPUTER';
  if (lc.includes("bengali")) return 'BENGALI';
  return null;
};

async function loadPage(url, cdpUrl) {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  await page.bringToFront();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await randomWait();
  return { page, browser };
}

async function clickButton(page, selector, buttonName) {
  const el = await page.$(selector);
  if (!el) {
    console.error(`[-] ${buttonName} not found. Exiting.`);
    process.exit(1);
  }
  await el.click();
  console.log(`[*] ${buttonName} clicked.`);
  await page.waitForTimeout(1000);
}

async function clickNext(page) {
  try {
    const nextButton = await page.waitForSelector('button[ng-click="navBtnPressed(true)"]', { timeout: 5000 });
    await nextButton.click();
    await page.waitForTimeout(1500);

    const endOfQuizSelector = '//*[contains(text(), "You have reached the last question")]';
    const endOfQuizElement = await page.waitForSelector(endOfQuizSelector, { state: 'visible', timeout: 2000 }).catch(() => null);

    if (endOfQuizElement) {
      console.log('[i] Detected the last question confirmation dialog. End of quiz reached.');
      return false;
    }

    await page.waitForSelector(selectors.parser.activeQuestionContainer, { timeout: 5000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);
    return true;

  } catch (error) {
    console.log('[i] Could not proceed to the next question. Assuming end of quiz.');
    return false;
  }
}

async function clickViewSolution(page) {
  const viewButton = await page.$('button[ng-click="toggleViewSolution()"]');
  if (!viewButton) {
    console.error('[-] View Solution button not found. Exiting.');
    process.exit(1);
  }
  await viewButton.click();
  await page.waitForTimeout(1000 + Math.random() * 2000);
}

async function humanizedScroll(page, selector) {
  const el = await page.$(selector);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.evaluate(element => {
      element.scrollBy(0, Math.floor(Math.random() * 50 + 50));
    }, el);
    await page.waitForTimeout(500 + Math.random() * 500);
  }
}

async function humanizedMouseMovement(page) {
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }));

  const startX = Math.random() * width;
  const startY = Math.random() * height;
  await page.mouse.move(startX, startY);

  const randomSteps = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < randomSteps; i++) {
    const endX = Math.random() * width;
    const endY = Math.random() * height;
    await page.mouse.move(endX, endY, { steps: Math.floor(Math.random() * 10) + 5 });
  }
  await page.waitForTimeout(500 + Math.random() * 500);
}

async function scrapeAndSanitizeQuestion(page, serialNumber, userTag) {
  const html = await page.content();
  const $ = load(html);
  const container = $(selectors.parser.activeQuestionContainer);

  const sectionName = $(selectors.parser.sectionName).text().trim();
  const questionNumberText = container.find(selectors.parser.questionNumber).text().trim();
  const realQuestionNumber = parseInt(questionNumberText.match(/\d+$/)?.[0], 10) || 0;

  const derivedTag = getTagForQuestion(sectionName, realQuestionNumber);
  const tags = [];
  if (derivedTag) tags.push(derivedTag);
  if (userTag) tags.push(userTag);

  // --- MODIFICATION START ---
  // Extract comprehension and question body HTML separately.
  const comprehensionHtml = container.find(selectors.parser.comprehension).html();
  const questionBodyHtml = container.find(selectors.parser.questionBody).html() || '';
  
  let finalQuestionHtml;

  // If comprehensionHtml exists and is not empty, combine it with the question body.
  if (comprehensionHtml && comprehensionHtml.trim() !== '') {
    finalQuestionHtml = `${comprehensionHtml}<br><br><strong><b>Question:</b></strong><br>${questionBodyHtml}`;
  } else {
    // Otherwise, just use the question body.
    finalQuestionHtml = questionBodyHtml;
  }
  // --- MODIFICATION END ---

  const optionsHtml = [];
  container.find(selectors.parser.optionContainer).each((i, el) => {
    const htmlContent = $(el).find(selectors.parser.optionText).html();
    if (htmlContent) optionsHtml.push(htmlContent);
  });
  const answerHtml = container
    .find(selectors.parser.optionContainer)
    .filter((i, el) => $(el).hasClass(selectors.parser.correctOptionClass))
    .find(selectors.parser.optionText)
    .html() || '';
  const solutionHtml = container.find(selectors.parser.solution).html() || '';

  // Sanitize the final, potentially combined, question HTML.
  const sanitizedQuestion = await transformAndSanitizeHtml(finalQuestionHtml);
  
  const sanitizedOptions = await Promise.all(
    optionsHtml.slice(0, 4).map(opt => transformAndSanitizeHtml(opt))
  );
  const sanitizedAnswerText = await transformAndSanitizeHtml(answerHtml);
  const sanitizedSolution = await transformAndSanitizeHtml(solutionHtml);

  const answerIndex = sanitizedOptions.findIndex(opt => opt === sanitizedAnswerText);
  const finalAnswer = answerIndex !== -1 ? (answerIndex + 1).toString() : '';

  return {
    SL: serialNumber,
    Question: sanitizedQuestion,
    OP1: sanitizedOptions[0] || '',
    OP2: sanitizedOptions[1] || '',
    OP3: sanitizedOptions[2] || '',
    OP4: sanitizedOptions[3] || '',
    Answer: finalAnswer,
    Solution: sanitizedSolution,
    Tags: tags
  };
}

function parseArguments() {
  const program = new Command();
  program
    .option('--link <url>', 'URL of the quiz/analysis page')
    .option('--count <number>', 'Number of questions to scrape', parseInt)
    .option('--tag <string>', 'A custom tag to add to every question')
    .option('--skip <number>', 'Number of questions to skip before starting', parseInt)
    .parse(process.argv);

  const options = program.opts();
  if (!options.link) {
    console.error('[-] Please provide a URL using --link');
    process.exit(1);
  }
  options.skip = options.skip || 0;
  return options;
}

async function scrapeQuestions(page, count, userTag, skip = 0) {
  const scrapedQuestions = [];
  let questionsScraped = 0;

  for (let i = 0; i < skip; i++) {
    const hasNext = await clickNext(page);
    if (!hasNext) {
      console.log('[i] Reached the last question while skipping. Ending.');
      return scrapedQuestions;
    }
    console.log(`[i] Skipped question ${i + 1}`);
  }

  while (true) {
    await clickViewSolution(page);
    await humanizedScroll(page, selectors.parser.activeQuestionContainer);
    await humanizedMouseMovement(page);

    const data = await scrapeAndSanitizeQuestion(page, questionsScraped + 1 + skip, userTag);
    scrapedQuestions.push(data);
    questionsScraped++;
    console.log(`[*] Scraping Question ${questionsScraped + skip}...`);

    if (count && questionsScraped >= count) break;

    const hasNext = await clickNext(page);
    if (!hasNext) {
      console.log('[i] Reached the last question. Ending scraping.');
      break;
    }
  }
  return scrapedQuestions;
}

async function saveScrapedData(examName, scrapedQuestions) {
  const sanitizedExamName = sanitizeFilename(examName);
  const outputDir = path.resolve('output', 'scraped');
  const outputPath = path.join(outputDir, `${sanitizedExamName}.json`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(scrapedQuestions, null, 2), 'utf-8');

  console.log(`[+] Saved scraped data to ${outputPath}`);
}

async function main() {
  const CDP_URL = 'http://localhost:9223';
  let page;
  let browser;

  try {
    const options = parseArguments();
    if (options.tag) console.log(`[i] Applying custom tag to all questions: "${options.tag}"`);

    const { page: newPage, browser: newBrowser } = await loadPage(options.link, CDP_URL);
    page = newPage;
    browser = newBrowser;

    const $ = load(await page.content());
    const examName = $(selectors.parser.examName).text().trim();
    if (!examName) throw new Error('Exam Name not found');
    console.log(`[i] Found Exam Name: ${examName}`);

    await humanizedMouseMovement(page);
    await clickButton(page, selectors.scraper.solutionsButton, 'Solutions');
    await page.waitForTimeout(1000 + Math.random() * 2000);
    await page.waitForSelector(selectors.parser.activeQuestionContainer, { timeout: 5000 });

    const scrapedQuestions = await scrapeQuestions(page, options.count, options.tag, options.skip);
    console.log(`[+] Scraped a total of ${scrapedQuestions.length} questions successfully.`);

    await saveScrapedData(examName, scrapedQuestions);

  } catch (err) {
    console.error(`[-] An error occurred: ${err.message}`);
    process.exit(1);
  } finally {
    if (page && !page.isClosed()) await page.close();
    if (browser && browser.isConnected()) {
      await browser.close();
      console.log('[i] Disconnected from the browser.');
    }
  }
}

main();