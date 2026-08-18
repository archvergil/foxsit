export const createDatabaseAccess = (database) => {
  let queue = Promise.resolve()

  const withDatabaseLock = (operation) => {
    const result = queue.then(operation, operation)
    queue = result.then(() => undefined, () => undefined)
    return result
  }

  const withAuthenticatedUser = (userId, operation) => withDatabaseLock(async () => {
    await database.query("select set_config('request.jwt.claim.sub', $1, false)", [userId])
    await database.exec('set role authenticated')
    try {
      return await operation()
    } finally {
      await database.exec('reset role')
      await database.query("select set_config('request.jwt.claim.sub', '', false)")
    }
  })

  return { withDatabaseLock, withAuthenticatedUser }
}
