import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { InteractionManager, ActivityIndicator, View } from 'react-native';
import { useFocusEffect, useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import Share from 'react-native-share';
import { styles, useDynamicStyles } from './xpub.styles';
import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, BlueText, BlueCopyTextToClipboard } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';
import HandoffComponent from '../../components/handoff';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { AbstractWallet } from '../../class';

type WalletXpubRouteProp = RouteProp<{ params: { walletID: string; xpub: string } }, 'params'>;
export type RootStackParamList = {
  WalletXpub: {
    walletID: string;
    xpub: string;
  };
};

const WalletXpub: React.FC = () => {
  const { wallets } = useContext(BlueStorageContext);
  const route = useRoute<WalletXpubRouteProp>();
  const { walletID, xpub } = route.params;
  const wallet = wallets.find((w: AbstractWallet) => w.getID() === walletID);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xPubText, setXPubText] = useState<string | undefined>(undefined);
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'WalletXpub'>>();
  const stylesHook = useDynamicStyles(); // This now includes the theme implicitly
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);
  const lastWalletIdRef = useRef<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      // Skip execution if walletID hasn't changed
      if (lastWalletIdRef.current === walletID) {
        return;
      }
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

          if (isBiometricsEnabled) {
            if (!(await Biometric.unlockWithBiometrics())) {
              return navigation.goBack();
            }
          }
          const walletXpub = wallet.getXpub();
          if (xpub !== walletXpub) {
            navigation.setParams({ xpub: walletXpub });
          }

          setIsLoading(false);
        } else if (xpub) {
          setIsLoading(false);
        }
      });
      lastWalletIdRef.current = walletID;
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
    }, [wallet, xpub, walletID, navigation]),
  );

  useEffect(() => {
    setXPubText(xpub);
  }, [xpub]);

  const onLayout = (e: { nativeEvent: { layout: { width: any; height?: any } } }) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  const handleShareButtonPressed = useCallback(() => {
    Share.open({ message: xpub }).catch(console.log);
  }, [xpub]);

  return (
    <SafeArea style={[styles.root, stylesHook.root]} onLayout={onLayout}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <View style={styles.container}>
            {wallet && (
              <>
                <View>
                  <BlueText>{wallet.typeReadable}</BlueText>
                </View>
                <BlueSpacing20 />
              </>
            )}
            <QRCodeComponent value={xpub} size={qrCodeSize} />

            <BlueSpacing20 />
            <BlueCopyTextToClipboard text={xPubText} />
          </View>
          <HandoffComponent title={loc.wallets.xpub_title} type={HandoffComponent.activityTypes.Xpub} userInfo={{ xpub: xPubText }} />
          <View style={styles.share}>
            <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </View>
        </>
      )}
    </SafeArea>
  );
};

// @ts-ignore: Deal with later
WalletXpub.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerBackVisible: false,
  },
  opts => ({ ...opts, headerTitle: loc.wallets.xpub_title }),
);

export default WalletXpub;