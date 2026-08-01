@echo off
title Reinitialisation Sauvegarde TortueSurvivor
echo ===================================================
echo     REINITIALISATION DE LA SAUVEGARDE DU JEU
echo ===================================================
echo.
echo ATTENTION : Cela va effacer toute votre progression 
echo (victoires, modes debloques, sauvegardes, etc.)
echo.
echo Veuillez vous assurer que le jeu est ferme avant de continuer.
echo.
pause

echo.
echo Suppression des donnees en cours...

set SAVE_DIR="%APPDATA%\tortuesurvivor"

if exist %SAVE_DIR% (
    rmdir /S /Q %SAVE_DIR%
    echo.
    echo [+] Toutes les sauvegardes ont ete supprimees avec succes !
    echo [+] Le jeu redemarrera comme neuf.
) else (
    echo.
    echo [-] Aucune sauvegarde trouvee. Le jeu est deja vierge.
)

echo.
pause
