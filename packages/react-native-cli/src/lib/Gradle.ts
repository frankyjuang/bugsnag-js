import { Logger } from '../Logger'
import { promises as fs } from 'fs'
import path from 'path'

const GRADLE_PLUGIN_IMPORT = 'classpath("com.bugsnag:bugsnag-android-gradle-plugin:5.+")'
const GRADLE_PLUGIN_APPLY = 'apply plugin: "com.bugsnag.android.gradle"'
const DOCS_LINK = 'https://docs.bugsnag.com/build-integrations/gradle/#installation'

export async function modifyRootBuildGradle (projectRoot: string, logger: Logger): Promise<void> {
  logger.debug('Looking for android/build.gradle')
  const topLevelBuildGradlePath = path.join(projectRoot, 'android', 'build.gradle')
  logger.debug('Importing com.bugsnag:bugsnag-android-gradle-plugin')
  try {
    await insertValueAfterPattern(
      topLevelBuildGradlePath,
      /[\r\n]\s*classpath\(["']com.android.tools.build:gradle:.+["']\)/,
      GRADLE_PLUGIN_IMPORT,
      logger
    )
  } catch (e) {
    if (e.message === 'Pattern not found') {
      logger.warn(
        `The gradle file was in an unexpected format and so couldn't be updated automatically.

Add '${GRADLE_PLUGIN_IMPORT}' to the 'buildscript.dependencies section of android/build.gradle

See ${DOCS_LINK} for more information`
      )
    } else if (e.code === 'ENOENT') {
      logger.warn(
        `A gradle file was not found at the expected location and so couldn't be updated automatically.

Add '${GRADLE_PLUGIN_IMPORT}' to the 'buildscript.dependencies section of your project's build.gradle

See ${DOCS_LINK} for more information`
      )
    } else {
      throw e
    }
  }
  logger.success('Finished modifying android/build.gradle')
}

export async function modifyAppBuildGradle (projectRoot: string, logger: Logger): Promise<void> {
  logger.debug('Looking for android/app/build.gradle')
  const appBuildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle')
  logger.debug('Applying com.bugsnag.android.gradle plugin')
  try {
    await insertValueAfterPattern(
      appBuildGradlePath,
      /apply plugin: ["']com\.android\.application["']/,
      GRADLE_PLUGIN_APPLY,
      logger
    )
  } catch (e) {
    if (e.message === 'Pattern not found') {
      logger.warn(
        `The gradle file was in an unexpected format and so couldn't be updated automatically.

Add '${GRADLE_PLUGIN_APPLY}' to android/app/build.gradle

See ${DOCS_LINK} for more information`
      )
    } else if (e.code === 'ENOENT') {
      logger.warn(
        `A gradle file was not found at the expected location and so couldn't be updated automatically.

Add '${GRADLE_PLUGIN_APPLY}' to your app module's build.gradle

See ${DOCS_LINK} for more information`
      )
    } else {
      throw e
    }
  }
  logger.success('Finished modifying android/app/build.gradle')
}

async function insertValueAfterPattern (file: string, pattern: RegExp, value: string, logger: Logger): Promise<void> {
  const fileContents = await fs.readFile(file, 'utf8')

  if (fileContents.includes(value)) {
    logger.warn('Value already found in file, skipping.')
    return
  }

  const match = fileContents.match(pattern)
  if (!match || match.index === undefined || !match.input) {
    throw new Error('Pattern not found')
  }

  const splitLocation = match.index + match[0].length
  const [indent] = match[0].match(/[\r\n]\s*/) || ['\n']
  const firstChunk = fileContents.substr(0, splitLocation)
  const lastChunk = fileContents.substring(splitLocation)

  const output = `${firstChunk}${indent}${value}${lastChunk}`

  await fs.writeFile(file, output, 'utf8')
}
