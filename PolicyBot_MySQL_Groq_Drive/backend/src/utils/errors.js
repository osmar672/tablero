export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export function requireValue(v,message){if(!v)throw new HttpError(400,message);return v;}
