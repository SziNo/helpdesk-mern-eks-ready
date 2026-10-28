import { useState } from 'react'
import { toast } from 'react-toastify'
import { toastError } from '../utils'
import { useNavigate } from 'react-router'
import { FaSignInAlt } from 'react-icons/fa'
import { useSelector, useDispatch } from 'react-redux'
import { login } from '../features/auth/authSlice'
import Spinner from '../components/Spinner'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const { email, password } = formData

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { isLoading } = useSelector((state) => state.auth)

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }))
  }

  // MEGJEGYZÉS: itt nincs szükség useEffectre, mert az AsyncThunkAction
  // elutasítását az onSubmitban elkapjuk, sikernél pedig ott navigálunk tovább.
  // A mellékhatások lehetőleg eseménykezelőkbe kerüljenek, forrás:
  // https://react.dev/learn/keeping-components-pure#where-you-can-cause-side-effects

  const onSubmit = (e) => {
    e.preventDefault()

    const userData = {
      email,
      password,
    }

    dispatch(login(userData))
      .unwrap()
      .then((user) => {
        // MEGJEGYZÉS: az AsyncThunkAction unwrap()-olásával sikeres API válasz után
        // navigálhatunk, hiba esetén pedig elkapjuk és hibaüzenetet mutatunk
        toast.success(`Logged in as ${user.name}`)
        navigate('/')
      })
      .catch(toastError)
  }

  if (isLoading) {
    return <Spinner />
  }

  return (
    <>
      <section className='heading'>
        <h1>
          <FaSignInAlt /> Login
        </h1>
        <p>Please log in to get support</p>
      </section>

      <section className='form'>
        <form onSubmit={onSubmit}>
          <div className='form-group'>
            <input
              type='email'
              className='form-control'
              id='email'
              name='email'
              value={email}
              onChange={onChange}
              placeholder='Enter your email'
              required
            />
          </div>
          <div className='form-group'>
            <input
              type='password'
              className='form-control'
              id='password'
              name='password'
              value={password}
              onChange={onChange}
              placeholder='Enter password'
              required
            />
          </div>
          <div className='form-group'>
            <button className='btn btn-block'>Submit</button>
          </div>
        </form>
      </section>
    </>
  )
}

export default Login
