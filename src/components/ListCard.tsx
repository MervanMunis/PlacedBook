// ListCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

type ListCardProps = {
  name: string;
  productCount: number;
  editMode: boolean;
  onRename: () => void;
  onDelete: () => void;
  onPress: () => void;
  drag: () => void;
  isActive: boolean;
  onPublish: () => void;
};

const ListCard: React.FC<ListCardProps> = ({
  name,
  productCount,
  editMode,
  onRename,
  onDelete,
  onPress,
  drag,
  isActive,
  onPublish,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Define color variables
  const textColor = theme === 'dark' ? '#fdfcfd' : '#000';
  const backgroundColor = theme === 'dark' ? '#000' : '#fdfcfd';
  const iconColor = 'gray';

  return (
    <ScaleDecorator>
      <View
        className={`p-4 rounded-lg mb-4 flex-row items-center ${
          isActive ? 'opacity-75' : ''
        }`}
        style={{ backgroundColor: backgroundColor }}
      >
        {/* Drag Handle */}
        {editMode && (
          <TouchableOpacity onLongPress={drag} className="p-2 mr-2">
            <MaterialIcons name="drag-handle" size={24} color={iconColor} />
          </TouchableOpacity>
        )}

        {/* List Name and Product Count */}
        <TouchableOpacity onPress={onPress} className="flex-1">
          <Text className="text-lg mr-2" style={{ color: textColor }}>
            {name}
          </Text>
          <Text className="text-sm" style={{ color: textColor }}>
            {productCount} {t('productCount')}
          </Text>
        </TouchableOpacity>

        {/* Publish Icon */}
        {!editMode && (
          <TouchableOpacity onPress={onPublish} className="p-2 ml-2">
            <FontAwesome name="share-alt" size={24} color="#1E88E5" />
          </TouchableOpacity>
        )}

        {/* Edit and Delete Icons */}
        {editMode && (
          <View className="flex-row items-center">
            <TouchableOpacity onPress={onRename} className="p-2">
              <Ionicons name="create-outline" size={24} color="#1E88E5" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onDelete} className="p-2 ml-2">
              <FontAwesome name="trash" size={24} color="#EF5350" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScaleDecorator>
  );
};

export default ListCard;
