// Global constants for easy configuration
const SPREADSHEET_ID = '[YOUR_SPREADSHEET_ID_HERE]';
const PHOTO_FOLDER_ID = '[YOUR_PHOTO_FOLDER_ID_HERE]';
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const rosterSheet = ss.getSheetByName('Roster');
const trackingSheet = ss.getSheetByName('Tracking');
const usersSheet = ss.getSheetByName('Users');

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate().setTitle("Student Caller Micro-App");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getUserData() {
  const userEmail = Session.getActiveUser().getEmail();
  const allKnownClasses = getAllClasses();
  if (!userEmail) return { error: "Could not identify user." };

  const userData = usersSheet.getDataRange().getValues();
  let registeredSessions = [];
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === userEmail && userData[i][1]) {
      registeredSessions = userData[i][1].toString().split(',').map(s => s.trim()).filter(s => s.length > 0);
      break;
    }
  }
  return { registered: registeredSessions, all: allKnownClasses };
}

function registerSession(className, subject) {
  const userEmail = Session.getActiveUser().getEmail();
  const newSessionId = `${className} (${subject})`;
  if (!userEmail || !className || !subject) return { error: "Class or subject is invalid." };

  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1, existingSessions = [];
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === userEmail) {
      userRow = i + 1;
      if (userData[i][1]) existingSessions = userData[i][1].toString().split(',').map(s => s.trim()).filter(s => s.length > 0);
      break;
    }
  }

  if (existingSessions.includes(newSessionId)) return { status: "Already registered", sessions: existingSessions };

  existingSessions.push(newSessionId);
  existingSessions.sort();

  if (userRow !== -1) usersSheet.getRange(userRow, 2).setValue(existingSessions.join(', '));
  else usersSheet.appendRow([userEmail, newSessionId]);

  return { status: "Success", sessions: existingSessions };
}

function unregisterSession(sessionId) {
  const userEmail = Session.getActiveUser().getEmail();
  if (!userEmail || !sessionId) return { error: "Invalid request." };

  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1, existingSessions = [];
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === userEmail) {
      userRow = i + 1;
      if (userData[i][1]) existingSessions = userData[i][1].toString().split(',').map(s => s.trim());
      break;
    }
  }
  const updatedSessions = existingSessions.filter(s => s !== sessionId);
  if (userRow !== -1) usersSheet.getRange(userRow, 2).setValue(updatedSessions.join(', '));
  return { status: "Success", sessions: updatedSessions };
}

function getAllClasses() {
  const data = rosterSheet.getRange(2, 1, rosterSheet.getLastRow() - 1, 2).getValues();
  const classSet = new Set(data.map(row => `${row[0]}-${row[1]}`));
  return Array.from(classSet).sort();
}

function parseClassNameFromSession(sessionId) {
    if (!sessionId || !sessionId.includes('(')) return sessionId;
    return sessionId.substring(0, sessionId.lastIndexOf('(')).trim();
}

// NEW: This function gets the entire shuffled queue for the client to manage
function getShuffledStudentQueue(sessionId, groupSelection) {
  const className = parseClassNameFromSession(sessionId);
  if (!className) return [];

  const userEmail = Session.getActiveUser().getEmail();
  const [grade, classNum] = className.split('-');
  const allStudentsData = rosterSheet.getRange(2, 1, rosterSheet.getLastRow() - 1, 8).getValues();

  let classStudents = allStudentsData
    .filter(row => row[0] == grade && row[1] == classNum)
    .map(row => ({
      id: `${row[0]}${row[1]}${row[2]}`,
      number: row[2],
      name: row[3],
      furigana: row[4],
      frontBack: row[6] || '',
      details: row[7] || ''
    }));

  if (groupSelection === "1" || groupSelection === "2") {
    classStudents = classStudents.filter(student => String(student.frontBack) === groupSelection);
  }

  const trackingData = trackingSheet.getDataRange().getValues();
  const userTracking = {};
  trackingData.forEach(row => {
    if (row[0] === userEmail && row[1] === sessionId) userTracking[row[2]] = row[3];
  });

  let availableStudents = classStudents.filter(student => {
    const status = userTracking[student.id];
    return status !== 'Called' && status !== 'Skipped';
  });

  // Fisher-Yates shuffle algorithm
  for (let i = availableStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableStudents[i], availableStudents[j]] = [availableStudents[j], availableStudents[i]];
  }

  return availableStudents; // Return the whole shuffled queue
}

function markStudentStatus(sessionId, studentId, status) {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || !sessionId || !studentId || !status) return;

    const data = trackingSheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userEmail && data[i][1] === sessionId && String(data[i][2]) === String(studentId)) {
            trackingSheet.getRange(i + 1, 4).setValue(status);
            trackingSheet.getRange(i + 1, 5).setValue(new Date());
            found = true;
            break;
        }
    }
    if (!found) {
        trackingSheet.appendRow([userEmail, sessionId, studentId, status, new Date()]);
    }
}

function startNewRound(sessionId) {
  const userEmail = Session.getActiveUser().getEmail();
  const trackingRange = trackingSheet.getRange("A:E");
  const trackingData = trackingRange.getValues();

  for (let i = 1; i < trackingData.length; i++) {
    if(trackingData[i][0] === userEmail && trackingData[i][1] === sessionId) {
      trackingSheet.getRange(i + 1, 4).setValue('Uncalled');
      trackingSheet.getRange(i + 1, 5).setValue(new Date());
    }
  }
}

function getStudentPhotoAsBase64(className, studentNumber) {
  try {
    const parentFolder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    const classFolders = parentFolder.getFoldersByName(className);
    if (!classFolders.hasNext()) return null;

    const classFolder = classFolders.next();
    const files = classFolder.getFiles();
    const paddedNum = String(studentNumber).padStart(3, '0');
    const simpleNum = String(studentNumber);

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName.startsWith(paddedNum) || fileName.startsWith(simpleNum + '_')) {
        const blob = file.getBlob();
        return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
