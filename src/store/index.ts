import { createStore } from '@stencil/store'

const { state } = createStore({ users: new Map() } as Store)

function setUser(uid: string, newUser: Partial<User>) {
  state.users.set(uid, {
    ...state.users.get(uid),
    ...newUser,
  })
  state.users = new Map(state.users)
}

function deleteUser(uid: string) {
  state.users.delete(uid)
  state.users = new Map(state.users)
}

export { state, setUser, deleteUser }
