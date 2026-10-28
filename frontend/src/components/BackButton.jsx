import { FaArrowCircleLeft } from 'react-icons/fa'
import { useNavigate } from 'react-router'

// MEGJEGYZÉS: a böngésző előzményeiben lépünk vissza, így valódi "vissza" gomb

const BackButton = () => {
  const navigate = useNavigate()
  return (
    <button className='btn btn-reverse btn-back' onClick={() => navigate(-1)}>
      <FaArrowCircleLeft /> Back
    </button>
  )
}

export default BackButton
