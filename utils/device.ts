import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { getLocales, getCalendars } from 'expo-localization'

export const getDevice = () => {
  return Device?.modelName
}

export const getOs = () => {
  return Device.osName?.toLowerCase() || 'unknown'
}

export const getOsVersion = () => {
  return Device.osVersion || 'unknown'
}

export const getLanguage = () => {
  return getLocales()[0].languageTag
}

export const getRegion = () => {
  return getLocales()[0].regionCode
}

export const getTimeZone = () => {
  return getCalendars()[0].timeZone
}

export const getVersion = () => {
  return Constants.expoConfig?.version || 'unknown'
}
