import FunctionsClient from '../functions_client';

export default function takeScreenshot(html) {
  return FunctionsClient.execute(process.env.SCREENSHOT_SERVICE_FUNCTION_NAME, { html })
}