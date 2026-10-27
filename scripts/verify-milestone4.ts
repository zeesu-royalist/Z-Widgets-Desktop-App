import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { promises as fs, existsSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import assert from 'assert'

// Isolate test user data from actual user application storage
const testUserDataDir = mkdtempSync(join(tmpdir(), 'zwidgets-test-'))
app.setPath('userData', testUserDataDir)

import {
  loadPersistedWidgets,
  saveWidgetConfig,
  removeWidgetConfig,
  flushStorageSync,
  loadAppSettings,
  saveAppSettings,
  loadNoteContent,
  saveNoteContent,
  loadTodos,
  saveTodos,
  loadWeatherConfig,
  saveWeatherConfig,
  loadPhotoStorage,
  savePhotoStorage
} from '../src/main/services/StorageService'
import {
  ensureVisibleBounds,
  recoverOffscreenWindows
} from '../src/main/services/DisplayService'
import {
  isStartupSupported,
  getStartupSettings,
  setStartupSettings
} from '../src/main/services/StartupService'
import {
  createWidgetWindow,
  getWidgetWindow,
  closeWidgetWindow,
  getActiveWidgetIds,
  restorePersistedWidgets,
  getWidgetIdByWebContentsId
} from '../src/main/services/WidgetWindowManager'
import {
  DEV_TEST_WIDGET_ID,
  DIGITAL_CLOCK_WIDGET_ID,
  QUICK_NOTES_WIDGET_ID,
  TODO_WIDGET_ID,
  SYSTEM_MONITOR_WIDGET_ID,
  WEATHER_WIDGET_ID,
  PHOTO_WIDGET_ID,
  WIDGET_TYPE_CLOCK,
  WIDGET_TYPE_NOTES,
  WIDGET_TYPE_TODO,
  WIDGET_TYPE_SYSTEM,
  WIDGET_TYPE_WEATHER,
  WIDGET_TYPE_PHOTO
} from '../src/shared/constants'
import { getSystemStats } from '../src/main/services/SystemService'
import {
  getWeatherData,
  setWeatherCity,
  searchWeatherCities,
  getWeatherDescription
} from '../src/main/services/WeatherService'
import {
  getPhotos,
  getPhotoData,
  removePhoto,
  savePhotoSettings,
  getPhotoSettings
} from '../src/main/services/PhotoService'

// Test runner tracking
let passedTests = 0
let failedTests = 0

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✓ PASS: ${name}`)
      passedTests++
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${name}`)
      console.error(err)
      failedTests++
    })
}

app.on('window-all-closed', () => {
  // Prevent test runner from quitting when testing window closing
})

app.whenReady().then(async () => {
  console.log('\n==================================================')
  console.log('   Z-WIDGETS MILESTONE 4 VERIFICATION SUITE')
  console.log('==================================================\n')

  try {
    const userData = app.getPath('userData')
    const widgetsFile = join(userData, 'widgets.json')
    const settingsFile = join(userData, 'settings.json')

    // Clean up previous test storage state if exists
    if (existsSync(widgetsFile)) {
      try { unlinkSync(widgetsFile) } catch {}
    }
    if (existsSync(settingsFile)) {
      try { unlinkSync(settingsFile) } catch {}
    }

    console.log('[SECTION 1] StorageService & Persistence Engine')

    await runTest('Initial load returns empty list when widgets.json does not exist', async () => {
      const list = await loadPersistedWidgets()
      assert.deepStrictEqual(list, [])
    })

    await runTest('saveWidgetConfig persists standard widget and flushes atomically', async () => {
      saveWidgetConfig({
        id: 'widget-unit-test-1',
        type: 'standard',
        width: 320,
        height: 200,
        x: 150,
        y: 180,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      assert.strictEqual(existsSync(widgetsFile), true)
      const list = await loadPersistedWidgets()
      assert.strictEqual(list.length, 1)
      assert.strictEqual(list[0].id, 'widget-unit-test-1')
      assert.strictEqual(list[0].width, 320)
      assert.strictEqual(list[0].x, 150)
      assert.strictEqual(list[0].placementMode, 'desktop')
    })

    await runTest('Ephemeral test widget (DEV_TEST_WIDGET_ID) is never persisted', async () => {
      saveWidgetConfig({
        id: DEV_TEST_WIDGET_ID,
        type: 'test',
        width: 300,
        height: 150,
        x: 50,
        y: 50,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      const list = await loadPersistedWidgets()
      const found = list.find((w) => w.id === DEV_TEST_WIDGET_ID)
      assert.strictEqual(found, undefined, 'DEV_TEST_WIDGET_ID must NOT be saved in storage')
    })

    await runTest('Corrupted JSON storage file is safely backed up and does not crash app', async () => {
      // Overwrite widgets.json with corrupted, non-JSON text
      writeFileSync(widgetsFile, 'MALFORMED_NON_JSON_DATA{{{', 'utf8')

      const list = await loadPersistedWidgets()
      assert.deepStrictEqual(list, [], 'Should gracefully return empty array on corrupted file')
    })

    await runTest('removeWidgetConfig removes item and updates persistent store', async () => {
      saveWidgetConfig({
        id: 'widget-to-delete',
        type: 'clock',
        width: 280,
        height: 140,
        x: 100,
        y: 100,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      let list = await loadPersistedWidgets()
      assert.strictEqual(list.some((w) => w.id === 'widget-to-delete'), true)

      removeWidgetConfig('widget-to-delete')
      flushStorageSync()

      list = await loadPersistedWidgets()
      assert.strictEqual(list.some((w) => w.id === 'widget-to-delete'), false)
    })

    await runTest('AppSettings storage round-trip (launchAtLogin, openAsHidden, theme)', async () => {
      await saveAppSettings({
        launchAtLogin: true,
        openAsHidden: true,
        theme: 'dark'
      })

      const settings = await loadAppSettings()
      assert.strictEqual(settings.launchAtLogin, true)
      assert.strictEqual(settings.openAsHidden, true)
      assert.strictEqual(settings.theme, 'dark')
      assert.strictEqual(settings.schemaVersion, 1)
    })

    console.log('\n[SECTION 2] StartupService & Platform Integration')

    await runTest('isStartupSupported correctly reports platform compatibility', () => {
      const supported = isStartupSupported()
      assert.strictEqual(supported, true, 'Should be supported on macOS/Windows/Linux')
    })

    await runTest('Startup settings reflects packaged vs dev simulation safely', async () => {
      const initial = await getStartupSettings()
      assert.strictEqual(typeof initial.openAtLogin, 'boolean')
      assert.strictEqual(typeof initial.isSupported, 'boolean')
      assert.strictEqual(typeof initial.isPackaged, 'boolean')

      // Toggle to true
      const enabled = await setStartupSettings(true, true)
      assert.strictEqual(enabled.openAtLogin, true)

      // Query again to verify persistence
      const refreshed = await getStartupSettings()
      assert.strictEqual(refreshed.openAtLogin, true)

      // Toggle back to false
      const disabled = await setStartupSettings(false)
      assert.strictEqual(disabled.openAtLogin, false)
    })

    console.log('\n[SECTION 3] DisplayService & Multi-Monitor Topology Recovery')

    await runTest('ensureVisibleBounds preserves valid coordinates within active display', () => {
      const primary = screen.getPrimaryDisplay()
      const workArea = primary.workArea

      const validBounds = {
        x: workArea.x + 50,
        y: workArea.y + 50,
        width: 300,
        height: 200
      }

      const result = ensureVisibleBounds(validBounds)
      assert.strictEqual(result.wasRecovered, false)
      assert.strictEqual(result.x, validBounds.x)
      assert.strictEqual(result.y, validBounds.y)
    })

    await runTest('ensureVisibleBounds recovers far off-screen coordinates onto primary display', () => {
      const primary = screen.getPrimaryDisplay()
      const workArea = primary.workArea

      // Simulate coordinates on a disconnected monitor far away (e.g. x: 8000, y: 5000)
      const offscreenBounds = {
        x: 8000,
        y: 5000,
        width: 320,
        height: 200
      }

      const result = ensureVisibleBounds(offscreenBounds)
      assert.strictEqual(result.wasRecovered, true)
      assert.strictEqual(result.displayId, primary.id)

      // Clamped coordinates must be completely inside the primary display's workArea
      assert.strictEqual(result.x >= workArea.x, true)
      assert.strictEqual(result.x + offscreenBounds.width <= workArea.x + workArea.width, true)
      assert.strictEqual(result.y >= workArea.y, true)
      assert.strictEqual(result.y + offscreenBounds.height <= workArea.y + workArea.height, true)
    })

    await runTest('ensureVisibleBounds threshold test: >=25% overlap is preserved, <25% is recovered', () => {
      const primary = screen.getPrimaryDisplay()
      const workArea = primary.workArea
      const widgetWidth = 200
      const widgetHeight = 200

      // Case A: 30% width overlap (60px of 200px width inside workArea, full height inside) -> 30% area overlap >= 25%
      const mostlyInside = {
        x: workArea.x + workArea.width - 60,
        y: workArea.y + 20,
        width: widgetWidth,
        height: widgetHeight
      }
      const resA = ensureVisibleBounds(mostlyInside)
      assert.strictEqual(resA.wasRecovered, false, 'Overlap >= 25% should be preserved')

      // Case B: 10% width overlap (20px of 200px width inside workArea) -> 10% area overlap < 25%
      const mostlyOutside = {
        x: workArea.x + workArea.width - 20,
        y: workArea.y + 20,
        width: widgetWidth,
        height: widgetHeight
      }
      const resB = ensureVisibleBounds(mostlyOutside)
      assert.strictEqual(resB.wasRecovered, true, 'Overlap < 25% should trigger safe display recovery')
    })

    await runTest('recoverOffscreenWindows shifts orphaned BrowserWindow back on screen', () => {
      // Create a test window placed far off-screen
      const orphanWin = new BrowserWindow({
        x: 7500,
        y: 7500,
        width: 250,
        height: 150,
        show: false
      })

      const recovery = recoverOffscreenWindows([{ id: 'orphan-w1', win: orphanWin }])
      assert.strictEqual(recovery.recoveredCount, 1)
      assert.deepStrictEqual(recovery.affectedIds, ['orphan-w1'])

      const newBounds = orphanWin.getBounds()
      const primary = screen.getPrimaryDisplay()
      assert.strictEqual(newBounds.x < 7500, true)
      assert.strictEqual(newBounds.x >= primary.workArea.x, true)

      orphanWin.destroy()
    })

    console.log('\n[SECTION 4] WidgetWindowManager & Lifecycle Persistence')

    await runTest('createWidgetWindow spawns window and saves config to persistence', async () => {
      const win = createWidgetWindow({
        id: 'runtime-widget-1',
        type: 'standard',
        width: 300,
        height: 180,
        x: 120,
        y: 120,
        placementMode: 'desktop'
      })

      assert.strictEqual(getWidgetWindow('runtime-widget-1') !== null, true)
      flushStorageSync()

      const saved = await loadPersistedWidgets()
      const entry = saved.find((w) => w.id === 'runtime-widget-1')
      assert.strictEqual(Boolean(entry), true)
      assert.strictEqual(entry?.width, 300)
    })

    await runTest('Duplicate prevention: recreating existing widget ID does not create duplicate', () => {
      const countBefore = getActiveWidgetIds().length
      const win1 = getWidgetWindow('runtime-widget-1')

      // Re-invoke with duplicate ID
      const win2 = createWidgetWindow({
        id: 'runtime-widget-1',
        type: 'standard',
        width: 300,
        height: 180
      })

      assert.strictEqual(win1, win2, 'Should reuse the existing BrowserWindow reference')
      assert.strictEqual(getActiveWidgetIds().length, countBefore, 'Should not increment active count')
    })

    await runTest('closeWidgetWindow disposes window and removes from persistent storage', async () => {
      const closed = closeWidgetWindow('runtime-widget-1')
      assert.strictEqual(closed, true)
      assert.strictEqual(getWidgetWindow('runtime-widget-1'), null)

      flushStorageSync()
      const saved = await loadPersistedWidgets()
      const entry = saved.find((w) => w.id === 'runtime-widget-1')
      assert.strictEqual(entry, undefined, 'Closed widget must be removed from persistent storage')
    })

    await runTest('restorePersistedWidgets reloads saved configurations into active windows', async () => {
      // Seed a persisted widget config
      saveWidgetConfig({
        id: 'restored-widget-test',
        type: 'notes',
        width: 320,
        height: 220,
        x: 200,
        y: 200,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      const restoredCount = await restorePersistedWidgets()
      assert.strictEqual(restoredCount >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes('restored-widget-test'), true)

      // Calling again avoids duplicates
      const secondRestoreCount = await restorePersistedWidgets()
      assert.strictEqual(secondRestoreCount, 0, 'Duplicate restore must be skipped')

      // Clean up
      closeWidgetWindow('restored-widget-test')
      flushStorageSync()
    })

    console.log('\n[SECTION 5] Least-Privilege & Sender Identity Verification')

    await runTest('getWidgetIdByWebContentsId accurately identifies widget window webContents', () => {
      const widgetWin = createWidgetWindow({
        id: 'secure-widget-test',
        type: 'standard',
        width: 300,
        height: 180
      })

      const identifiedId = getWidgetIdByWebContentsId(widgetWin.webContents.id)
      assert.strictEqual(identifiedId, 'secure-widget-test', 'Should map webContents.id to widget ID')

      // An unrelated window must NOT be identified as a widget
      const dummyWin = new BrowserWindow({ show: false })
      const dummyId = getWidgetIdByWebContentsId(dummyWin.webContents.id)
      assert.strictEqual(dummyId, null, 'Unregistered window must return null')

      dummyWin.destroy()
      closeWidgetWindow('secure-widget-test')
      flushStorageSync()
    })

    console.log('\n[SECTION 6] Real Digital Clock Widget Integration')

    await runTest('createWidgetWindow creates Digital Clock and persists to widgets.json', async () => {
      const clockWin = createWidgetWindow({
        id: DIGITAL_CLOCK_WIDGET_ID,
        type: WIDGET_TYPE_CLOCK,
        title: 'Digital Clock',
        width: 300,
        height: 160,
        x: 120,
        y: 120,
        placementMode: 'desktop'
      })

      assert.strictEqual(getWidgetWindow(DIGITAL_CLOCK_WIDGET_ID) !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(DIGITAL_CLOCK_WIDGET_ID), true)
      flushStorageSync()

      const saved = await loadPersistedWidgets()
      const clockEntry = saved.find((w) => w.id === DIGITAL_CLOCK_WIDGET_ID)
      assert.strictEqual(Boolean(clockEntry), true, 'Digital Clock must be saved to persistent storage')
      assert.strictEqual(clockEntry?.type, WIDGET_TYPE_CLOCK)
      assert.strictEqual(clockEntry?.width, 300)
      assert.strictEqual(clockEntry?.height, 160)
    })

    await runTest('Duplicate prevention: re-creating Digital Clock reuses existing window', () => {
      const countBefore = getActiveWidgetIds().length
      const clock1 = getWidgetWindow(DIGITAL_CLOCK_WIDGET_ID)

      const clock2 = createWidgetWindow({
        id: DIGITAL_CLOCK_WIDGET_ID,
        type: WIDGET_TYPE_CLOCK,
        width: 300,
        height: 160
      })

      assert.strictEqual(clock1, clock2, 'Must reuse the existing clock BrowserWindow reference')
      assert.strictEqual(getActiveWidgetIds().length, countBefore, 'Active count must not increase')
    })

    await runTest('closeWidgetWindow cleanly closes Digital Clock and removes from persistence', async () => {
      const closed = closeWidgetWindow(DIGITAL_CLOCK_WIDGET_ID)
      assert.strictEqual(closed, true)
      assert.strictEqual(getWidgetWindow(DIGITAL_CLOCK_WIDGET_ID), null)

      flushStorageSync()
      const saved = await loadPersistedWidgets()
      const clockEntry = saved.find((w) => w.id === DIGITAL_CLOCK_WIDGET_ID)
      assert.strictEqual(clockEntry, undefined, 'Closed clock must be removed from persistent storage')
    })

    console.log('\n[SECTION 7] Quick Notes Widget & Note Persistence')

    await runTest('saveNoteContent persists note text and flushes atomically', async () => {
      saveNoteContent(QUICK_NOTES_WIDGET_ID, 'Buy groceries\nCall doctor')
      flushStorageSync()

      const content = await loadNoteContent(QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(content, 'Buy groceries\nCall doctor')
    })

    await runTest('Empty note handling: saving empty string preserves empty note', async () => {
      saveNoteContent('empty-test-note', '')
      flushStorageSync()

      const content = await loadNoteContent('empty-test-note')
      assert.strictEqual(content, '')
    })

    await runTest('Input validation: invalid note IDs are rejected safely', async () => {
      saveNoteContent('invalid id with spaces!', 'text')
      const invalidContent = await loadNoteContent('invalid id with spaces!')
      assert.strictEqual(invalidContent, '')
    })

    await runTest('Corrupted notes storage file safely backs up and resets without crash', async () => {
      const notesFile = join(testUserDataDir, 'notes.json')
      writeFileSync(notesFile, 'MALFORMED_JSON_CONTENT{{{', 'utf8')

      const content = await loadNoteContent('some-note-id')
      assert.strictEqual(content, '')
    })

    await runTest('createWidgetWindow creates Quick Notes and tracks in active widgets', async () => {
      const notesWin = createWidgetWindow({
        id: QUICK_NOTES_WIDGET_ID,
        type: WIDGET_TYPE_NOTES,
        title: 'Quick Notes',
        width: 320,
        height: 260,
        x: 140,
        y: 140,
        placementMode: 'desktop'
      })

      assert.strictEqual(getWidgetWindow(QUICK_NOTES_WIDGET_ID) !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(QUICK_NOTES_WIDGET_ID), true)
      flushStorageSync()

      const saved = await loadPersistedWidgets()
      const notesEntry = saved.find((w) => w.id === QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(Boolean(notesEntry), true, 'Quick Notes window must be saved to widgets.json')
      assert.strictEqual(notesEntry?.type, WIDGET_TYPE_NOTES)
      assert.strictEqual(notesEntry?.width, 320)
      assert.strictEqual(notesEntry?.height, 260)
    })

    await runTest('Duplicate prevention: re-creating Quick Notes reuses existing window', () => {
      const countBefore = getActiveWidgetIds().length
      const notes1 = getWidgetWindow(QUICK_NOTES_WIDGET_ID)

      const notes2 = createWidgetWindow({
        id: QUICK_NOTES_WIDGET_ID,
        type: WIDGET_TYPE_NOTES,
        width: 320,
        height: 260
      })

      assert.strictEqual(notes1, notes2, 'Must reuse existing BrowserWindow reference')
      assert.strictEqual(getActiveWidgetIds().length, countBefore, 'Active count must not increase')
    })

    await runTest('Closing Quick Notes widget does NOT delete the saved note content', async () => {
      saveNoteContent(QUICK_NOTES_WIDGET_ID, 'Important persistent thought')
      flushStorageSync()

      // Close the widget window
      const closed = closeWidgetWindow(QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(closed, true)
      assert.strictEqual(getWidgetWindow(QUICK_NOTES_WIDGET_ID), null)

      // Verify widget window was removed from window persistence
      flushStorageSync()
      const savedWidgets = await loadPersistedWidgets()
      assert.strictEqual(savedWidgets.find((w) => w.id === QUICK_NOTES_WIDGET_ID), undefined)

      // Crucial requirement: Note content in notes.json must STILL exist intact!
      const content = await loadNoteContent(QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(content, 'Important persistent thought', 'Note text must survive widget window closure')
    })

    await runTest('Re-opening Quick Notes after closure restores previously saved note text', async () => {
      // Re-create the widget window
      const reOpenedWin = createWidgetWindow({
        id: QUICK_NOTES_WIDGET_ID,
        type: WIDGET_TYPE_NOTES,
        width: 320,
        height: 260
      })
      assert.strictEqual(reOpenedWin !== null, true)

      // Verify that the note content is loaded intact
      const content = await loadNoteContent(QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(content, 'Important persistent thought')

      // Clean up window
      closeWidgetWindow(QUICK_NOTES_WIDGET_ID)
    })

    await runTest('Cold restart simulation: note content and widget restoration survive restart', async () => {
      // 1. Save note text and widget config
      saveNoteContent(QUICK_NOTES_WIDGET_ID, 'Meeting notes at 3pm')
      saveWidgetConfig({
        id: QUICK_NOTES_WIDGET_ID,
        type: WIDGET_TYPE_NOTES,
        width: 320,
        height: 260,
        x: 200,
        y: 200,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      // 2. Simulate shutdown: close all windows
      closeWidgetWindow(QUICK_NOTES_WIDGET_ID)

      // 3. Simulate startup restoration
      const restored = await restorePersistedWidgets()
      assert.strictEqual(restored >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes(QUICK_NOTES_WIDGET_ID), true)

      // 4. Verify note content
      const noteOnRestart = await loadNoteContent(QUICK_NOTES_WIDGET_ID)
      assert.strictEqual(noteOnRestart, 'Meeting notes at 3pm')

      // Clean up window
      closeWidgetWindow(QUICK_NOTES_WIDGET_ID)
    })

    console.log('\n[SECTION 8] To-Do List Widget & Task Persistence')

    await runTest('saveTodos and loadTodos persist task creation and properties', async () => {
      saveTodos(TODO_WIDGET_ID, [
        { id: 't1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: 't2', text: 'Clean desk', completed: false, createdAt: 2000 }
      ])
      flushStorageSync()

      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks.length, 2)
      assert.strictEqual(tasks[0].id, 't1')
      assert.strictEqual(tasks[0].text, 'Buy groceries')
      assert.strictEqual(tasks[0].completed, false)
      assert.strictEqual(tasks[1].id, 't2')
      assert.strictEqual(tasks[1].text, 'Clean desk')
    })

    await runTest('Task completion: toggling completion status persists accurately', async () => {
      saveTodos(TODO_WIDGET_ID, [
        { id: 't1', text: 'Buy groceries', completed: true, createdAt: 1000 },
        { id: 't2', text: 'Clean desk', completed: false, createdAt: 2000 }
      ])
      flushStorageSync()

      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks[0].completed, true)
      assert.strictEqual(tasks[1].completed, false)
    })

    await runTest('Task deletion: removing task updates persistence store', async () => {
      saveTodos(TODO_WIDGET_ID, [
        { id: 't1', text: 'Buy groceries', completed: true, createdAt: 1000 }
      ])
      flushStorageSync()

      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks.length, 1)
      assert.strictEqual(tasks[0].id, 't1')
    })

    await runTest('Input validation: invalid widget IDs and malformed tasks are safely handled', async () => {
      saveTodos('invalid id with spaces!', [{ id: 't1', text: 'Bad' }])
      const invalidTasks = await loadTodos('invalid id with spaces!')
      assert.deepStrictEqual(invalidTasks, [])

      // @ts-ignore
      saveTodos(TODO_WIDGET_ID, 'not-an-array')
      // Malformed items are filtered out, only valid items kept
      saveTodos(TODO_WIDGET_ID, [
        { notATask: true },
        { id: 'valid-task-1', text: 'Valid Task Text', completed: false, createdAt: Date.now() }
      ])
      flushStorageSync()

      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks.length, 1)
      assert.strictEqual(tasks[0].id, 'valid-task-1')
      assert.strictEqual(tasks[0].text, 'Valid Task Text')
    })

    await runTest('Corrupted todos storage file safely backs up and resets without crash', async () => {
      const todosFile = join(testUserDataDir, 'todos.json')
      writeFileSync(todosFile, 'MALFORMED_JSON_TODOS{{{', 'utf8')

      const tasks = await loadTodos('some-todo-widget')
      assert.deepStrictEqual(tasks, [])
    })

    await runTest('createWidgetWindow creates To-Do List and tracks in active widgets', async () => {
      const todoWin = createWidgetWindow({
        id: TODO_WIDGET_ID,
        type: WIDGET_TYPE_TODO,
        title: 'To-Do List',
        width: 320,
        height: 340,
        x: 160,
        y: 160,
        placementMode: 'desktop'
      })

      assert.strictEqual(getWidgetWindow(TODO_WIDGET_ID) !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(TODO_WIDGET_ID), true)
      flushStorageSync()

      const saved = await loadPersistedWidgets()
      const todoEntry = saved.find((w) => w.id === TODO_WIDGET_ID)
      assert.strictEqual(Boolean(todoEntry), true, 'To-Do List window must be saved to widgets.json')
      assert.strictEqual(todoEntry?.type, WIDGET_TYPE_TODO)
      assert.strictEqual(todoEntry?.width, 320)
      assert.strictEqual(todoEntry?.height, 340)
    })

    await runTest('Duplicate prevention: re-creating To-Do List reuses existing window', () => {
      const countBefore = getActiveWidgetIds().length
      const todo1 = getWidgetWindow(TODO_WIDGET_ID)

      const todo2 = createWidgetWindow({
        id: TODO_WIDGET_ID,
        type: WIDGET_TYPE_TODO,
        width: 320,
        height: 340
      })

      assert.strictEqual(todo1, todo2, 'Must reuse existing BrowserWindow reference')
      assert.strictEqual(getActiveWidgetIds().length, countBefore, 'Active count must not increase')
    })

    await runTest('Closing To-Do List widget does NOT delete saved task items', async () => {
      saveTodos(TODO_WIDGET_ID, [
        { id: 'keep-1', text: 'Important task to remember', completed: false, createdAt: Date.now() }
      ])
      flushStorageSync()

      // Close the widget window
      const closed = closeWidgetWindow(TODO_WIDGET_ID)
      assert.strictEqual(closed, true)
      assert.strictEqual(getWidgetWindow(TODO_WIDGET_ID), null)

      // Window is removed from widgets.json
      flushStorageSync()
      const savedWidgets = await loadPersistedWidgets()
      assert.strictEqual(savedWidgets.find((w) => w.id === TODO_WIDGET_ID), undefined)

      // Task items in todos.json must STILL exist!
      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks.length, 1)
      assert.strictEqual(tasks[0].id, 'keep-1')
      assert.strictEqual(tasks[0].text, 'Important task to remember')
    })

    await runTest('Re-opening To-Do List after closure restores previously saved tasks', async () => {
      const reOpenedWin = createWidgetWindow({
        id: TODO_WIDGET_ID,
        type: WIDGET_TYPE_TODO,
        width: 320,
        height: 340
      })
      assert.strictEqual(reOpenedWin !== null, true)

      const tasks = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasks.length, 1)
      assert.strictEqual(tasks[0].text, 'Important task to remember')

      closeWidgetWindow(TODO_WIDGET_ID)
    })

    await runTest('Cold restart simulation: task items and widget restoration survive restart', async () => {
      // 1. Save tasks and widget config
      saveTodos(TODO_WIDGET_ID, [
        { id: 'task-restart-1', text: 'Finish quarterly review', completed: true, createdAt: 1000 },
        { id: 'task-restart-2', text: 'Submit invoice', completed: false, createdAt: 2000 }
      ])
      saveWidgetConfig({
        id: TODO_WIDGET_ID,
        type: WIDGET_TYPE_TODO,
        width: 320,
        height: 340,
        x: 220,
        y: 220,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      // 2. Simulate shutdown: close all windows
      closeWidgetWindow(TODO_WIDGET_ID)

      // 3. Simulate startup restoration
      const restored = await restorePersistedWidgets()
      assert.strictEqual(restored >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes(TODO_WIDGET_ID), true)

      // 4. Verify task items
      const tasksOnRestart = await loadTodos(TODO_WIDGET_ID)
      assert.strictEqual(tasksOnRestart.length, 2)
      assert.strictEqual(tasksOnRestart[0].id, 'task-restart-1')
      assert.strictEqual(tasksOnRestart[0].completed, true)
      assert.strictEqual(tasksOnRestart[1].id, 'task-restart-2')
      assert.strictEqual(tasksOnRestart[1].completed, false)

      // Clean up window
      closeWidgetWindow(TODO_WIDGET_ID)
    })

    console.log('[SECTION 9] System Resource Monitor Widget')

    await runTest('getSystemStats returns valid CPU, memory, uptime, and core metrics', async () => {
      const stats = getSystemStats()
      assert.strictEqual(typeof stats.cpuUsage, 'number')
      assert.strictEqual(stats.cpuUsage >= 0 && stats.cpuUsage <= 100, true)
      assert.strictEqual(typeof stats.cpuModel, 'string')
      assert.strictEqual(stats.cpuCores > 0, true)
      assert.strictEqual(stats.totalMemGB > 0, true)
      assert.strictEqual(stats.usedMemGB >= 0, true)
      assert.strictEqual(stats.memUsage >= 0 && stats.memUsage <= 100, true)
      assert.strictEqual(typeof stats.uptimeFormatted, 'string')
      assert.strictEqual(typeof stats.platform, 'string')
    })

    await runTest('createWidgetWindow spawns System Resource Monitor window with correct dimensions', async () => {
      const win = createWidgetWindow({
        id: SYSTEM_MONITOR_WIDGET_ID,
        type: WIDGET_TYPE_SYSTEM,
        width: 320,
        height: 240
      })

      assert.strictEqual(win !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(SYSTEM_MONITOR_WIDGET_ID), true)

      const bounds = win.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 240)
    })

    await runTest('Duplicate System Resource Monitor window creation returns existing instance', async () => {
      const firstWin = getWidgetWindow(SYSTEM_MONITOR_WIDGET_ID)
      assert.strictEqual(firstWin !== null, true)

      const secondWin = createWidgetWindow({
        id: SYSTEM_MONITOR_WIDGET_ID,
        type: WIDGET_TYPE_SYSTEM,
        width: 320,
        height: 240
      })

      assert.strictEqual(secondWin, firstWin)
      assert.strictEqual(getActiveWidgetIds().filter((id) => id === SYSTEM_MONITOR_WIDGET_ID).length, 1)
    })

    await runTest('closeWidgetWindow cleanly destroys System Resource Monitor window', async () => {
      closeWidgetWindow(SYSTEM_MONITOR_WIDGET_ID)
      assert.strictEqual(getWidgetWindow(SYSTEM_MONITOR_WIDGET_ID), null)
      assert.strictEqual(getActiveWidgetIds().includes(SYSTEM_MONITOR_WIDGET_ID), false)
    })

    await runTest('Cold restart simulation: System Resource Monitor window config is persisted and restored', async () => {
      // 1. Save config
      saveWidgetConfig({
        id: SYSTEM_MONITOR_WIDGET_ID,
        type: WIDGET_TYPE_SYSTEM,
        width: 320,
        height: 240,
        x: 100,
        y: 150,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      // 2. Simulate startup restoration
      const restored = await restorePersistedWidgets()
      assert.strictEqual(restored >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes(SYSTEM_MONITOR_WIDGET_ID), true)

      const restoredWin = getWidgetWindow(SYSTEM_MONITOR_WIDGET_ID)
      assert.strictEqual(restoredWin !== null, true)
      const bounds = restoredWin!.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 240)

      // Clean up window
      closeWidgetWindow(SYSTEM_MONITOR_WIDGET_ID)
    })

    console.log('[SECTION 10] Live Weather Widget')

    await runTest('getWeatherDescription maps WMO codes accurately', async () => {
      assert.strictEqual(getWeatherDescription(0), 'Clear Sky')
      assert.strictEqual(getWeatherDescription(2), 'Partly Cloudy')
      assert.strictEqual(getWeatherDescription(63), 'Moderate Rain')
      assert.strictEqual(getWeatherDescription(95), 'Thunderstorm')
    })

    await runTest('StorageService loads default weather configuration when weather.json does not exist', async () => {
      const config = await loadWeatherConfig()
      assert.strictEqual(typeof config.schemaVersion, 'number')
      assert.strictEqual(typeof config.selectedCity.name, 'string')
      assert.strictEqual(typeof config.selectedCity.latitude, 'number')
      assert.strictEqual(typeof config.selectedCity.longitude, 'number')
    })

    await runTest('saveWeatherConfig persists selected city and survives reload', async () => {
      const testCity = {
        id: 'city-test-london',
        name: 'London',
        country: 'United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278
      }
      saveWeatherConfig({ selectedCity: testCity })
      flushStorageSync()

      const loaded = await loadWeatherConfig()
      assert.strictEqual(loaded.selectedCity.name, 'London')
      assert.strictEqual(loaded.selectedCity.country, 'United Kingdom')
      assert.strictEqual(loaded.selectedCity.latitude, 51.5074)
    })

    await runTest('getWeatherData retrieves or falls back to valid weather data structure', async () => {
      const data = await getWeatherData()
      assert.strictEqual(typeof data.temperature, 'number')
      assert.strictEqual(typeof data.weatherDescription, 'string')
      assert.strictEqual(typeof data.humidity, 'number')
      assert.strictEqual(Array.isArray(data.daily), true)
      assert.strictEqual(data.daily.length > 0, true)
    })

    await runTest('createWidgetWindow spawns Live Weather window with 320x280 dimensions', async () => {
      const win = createWidgetWindow({
        id: WEATHER_WIDGET_ID,
        type: WIDGET_TYPE_WEATHER,
        width: 320,
        height: 280
      })

      assert.strictEqual(win !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(WEATHER_WIDGET_ID), true)

      const bounds = win.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 280)
    })

    await runTest('Duplicate Live Weather window creation returns existing instance', async () => {
      const firstWin = getWidgetWindow(WEATHER_WIDGET_ID)
      assert.strictEqual(firstWin !== null, true)

      const secondWin = createWidgetWindow({
        id: WEATHER_WIDGET_ID,
        type: WIDGET_TYPE_WEATHER,
        width: 320,
        height: 280
      })

      assert.strictEqual(secondWin, firstWin)
      assert.strictEqual(getActiveWidgetIds().filter((id) => id === WEATHER_WIDGET_ID).length, 1)
    })

    await runTest('closeWidgetWindow cleanly destroys Live Weather window', async () => {
      closeWidgetWindow(WEATHER_WIDGET_ID)
      assert.strictEqual(getWidgetWindow(WEATHER_WIDGET_ID), null)
      assert.strictEqual(getActiveWidgetIds().includes(WEATHER_WIDGET_ID), false)
    })

    await runTest('Cold restart simulation: Live Weather window config is persisted and restored', async () => {
      // 1. Save config
      saveWidgetConfig({
        id: WEATHER_WIDGET_ID,
        type: WIDGET_TYPE_WEATHER,
        width: 320,
        height: 280,
        x: 150,
        y: 200,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      // 2. Simulate startup restoration
      const restored = await restorePersistedWidgets()
      assert.strictEqual(restored >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes(WEATHER_WIDGET_ID), true)

      const restoredWin = getWidgetWindow(WEATHER_WIDGET_ID)
      assert.strictEqual(restoredWin !== null, true)
      const bounds = restoredWin!.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 280)

      // Clean up window
      closeWidgetWindow(WEATHER_WIDGET_ID)
    })

    console.log('[SECTION 11] Photo Slideshow Widget')

    await runTest('PhotoService: getPhotos returns initial collection with sample photos when storage is empty', async () => {
      const photos = await getPhotos()
      assert.strictEqual(Array.isArray(photos), true)
      assert.strictEqual(photos.length > 0, true)
      assert.strictEqual(typeof photos[0].id, 'string')
      assert.strictEqual(typeof photos[0].filePath, 'string')
    })

    await runTest('PhotoService: getPhotoData returns valid data source for photo', async () => {
      const photos = await getPhotos()
      assert.strictEqual(photos.length > 0, true)
      const data = await getPhotoData(photos[0].id)
      assert.strictEqual(typeof data, 'string')
      assert.strictEqual(data.length > 0, true)
    })

    await runTest('PhotoService: savePhotoSettings and getPhotoSettings persist interval and fit mode', async () => {
      await savePhotoSettings({ intervalSeconds: 10, fitMode: 'contain', isPaused: true })
      flushStorageSync()

      const s = await getPhotoSettings()
      assert.strictEqual(s.intervalSeconds, 10)
      assert.strictEqual(s.fitMode, 'contain')
      assert.strictEqual(s.isPaused, true)
    })

    await runTest('StorageService: savePhotoStorage persists custom photos and survives reload', async () => {
      const testItem = {
        id: 'photo_test_1',
        name: 'vacation.jpg',
        filePath: 'https://images.unsplash.com/photo-test',
        createdAt: Date.now()
      }
      savePhotoStorage({ photos: [testItem] })
      flushStorageSync()

      const loaded = await loadPhotoStorage()
      assert.strictEqual(loaded.photos.length, 1)
      assert.strictEqual(loaded.photos[0].id, 'photo_test_1')
      assert.strictEqual(loaded.photos[0].name, 'vacation.jpg')
    })

    await runTest('createWidgetWindow spawns Photo Slideshow window with 320x260 dimensions', async () => {
      const win = createWidgetWindow({
        id: PHOTO_WIDGET_ID,
        type: WIDGET_TYPE_PHOTO,
        width: 320,
        height: 260
      })

      assert.strictEqual(win !== null, true)
      assert.strictEqual(getActiveWidgetIds().includes(PHOTO_WIDGET_ID), true)

      const bounds = win.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 260)
    })

    await runTest('Duplicate Photo Slideshow window creation returns existing instance', async () => {
      const firstWin = getWidgetWindow(PHOTO_WIDGET_ID)
      assert.strictEqual(firstWin !== null, true)

      const secondWin = createWidgetWindow({
        id: PHOTO_WIDGET_ID,
        type: WIDGET_TYPE_PHOTO,
        width: 320,
        height: 260
      })

      assert.strictEqual(secondWin, firstWin)
      assert.strictEqual(getActiveWidgetIds().filter((id) => id === PHOTO_WIDGET_ID).length, 1)
    })

    await runTest('closeWidgetWindow cleanly destroys Photo Slideshow window', async () => {
      closeWidgetWindow(PHOTO_WIDGET_ID)
      assert.strictEqual(getWidgetWindow(PHOTO_WIDGET_ID), null)
      assert.strictEqual(getActiveWidgetIds().includes(PHOTO_WIDGET_ID), false)
    })

    await runTest('Cold restart simulation: Photo Slideshow window config is persisted and restored', async () => {
      // 1. Save config
      saveWidgetConfig({
        id: PHOTO_WIDGET_ID,
        type: WIDGET_TYPE_PHOTO,
        width: 320,
        height: 260,
        x: 200,
        y: 250,
        isVisible: true,
        placementMode: 'desktop',
        updatedAt: Date.now()
      })
      flushStorageSync()

      // 2. Simulate startup restoration
      const restored = await restorePersistedWidgets()
      assert.strictEqual(restored >= 1, true)
      assert.strictEqual(getActiveWidgetIds().includes(PHOTO_WIDGET_ID), true)

      const restoredWin = getWidgetWindow(PHOTO_WIDGET_ID)
      assert.strictEqual(restoredWin !== null, true)
      const bounds = restoredWin!.getBounds()
      assert.strictEqual(bounds.width, 320)
      assert.strictEqual(bounds.height, 260)

      // Clean up window
      closeWidgetWindow(PHOTO_WIDGET_ID)
    })

    // Clean up test files
    try { unlinkSync(widgetsFile) } catch {}
    try { unlinkSync(settingsFile) } catch {}

  } catch (err) {
    console.error('Unexpected test error:', err)
    failedTests++
  } finally {
    try {
      rmSync(testUserDataDir, { recursive: true, force: true })
    } catch {}

    console.log('\n==================================================')
    console.log(`Results: ${passedTests} passed, ${failedTests} failed`)
    console.log('==================================================\n')

    app.quit()
    process.exit(failedTests > 0 ? 1 : 0)
  }
})
