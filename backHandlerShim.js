import { BackHandler } from 'react-native';


if (typeof BackHandler.removeEventListener !== 'function') {
  BackHandler.removeEventListener = () => {

  };
}
