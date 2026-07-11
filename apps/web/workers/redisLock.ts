import { connection } from './queues'

export class RedisLock {
  constructor(
    private resource: string,
    private ttl: number = 30000
  ) {}

  async acquire(ownerId: string): Promise<boolean> {
    const result = await connection.set(this.resource, ownerId, 'PX', this.ttl, 'NX')
    return result === 'OK'
  }

  async release(ownerId: string): Promise<boolean> {
    // Lua script to ensure we only delete the lock if we own it
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    const result = await connection.eval(script, 1, this.resource, ownerId)
    return result === 1
  }
}
